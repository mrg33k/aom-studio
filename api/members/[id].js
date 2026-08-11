// GET /api/members/[id] - Get member details including company info
// PUT /api/members/[id] - Update member company linkage

import { requireSuperAdmin, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Member ID is required' });
  }

  // Member + company rows are PII (email, display_name, company linkage). Both
  // methods (read + the company-linkage write) were fully unauthenticated over
  // the service key — super-admin only now.
  try {
    await requireSuperAdmin(req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  // Initialize Supabase client
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  if (req.method === 'GET') {
    try {
      // First, get the member
      const { data: member, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching member:', error);
        return res.status(404).json({ error: 'Member not found' });
      }

      // Try to get company name if company_id exists
      let companyName = null;
      if (member.company_id) {
        try {
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', member.company_id)
            .single();
          companyName = company?.name || null;
        } catch (companyError) {
          // Companies table might not exist yet, ignore error
          console.warn('Could not fetch company name:', companyError.message);
        }
      }

      // Format response
      const response = {
        id: member.id,
        client_id: member.client_id,
        user_id: member.user_id,
        email: member.email,
        display_name: member.display_name,
        role: member.role,
        status: member.status,
        company_id: member.company_id,
        company_name: companyName,
        metadata: member.metadata,
        created_at: member.created_at,
        updated_at: member.updated_at
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error in GET /api/members/[id]:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { company_id } = req.body;

      // Validate request body
      if (company_id === undefined) {
        return res.status(400).json({ error: 'company_id is required in request body' });
      }

      // Check if member exists
      const { data: existingMember, error: fetchError } = await supabase
        .from('members')
        .select('id')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching member:', fetchError);
        return res.status(404).json({ error: 'Member not found' });
      }

      // If company_id is provided, validate it exists (if companies table exists)
      if (company_id) {
        try {
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('id')
            .eq('id', company_id)
            .single();

          if (companyError) {
            console.error('Error validating company:', companyError);
            return res.status(400).json({ error: 'Invalid company_id' });
          }
        } catch (tableError) {
          // Companies table might not exist yet
          console.warn('Companies table might not exist:', tableError.message);
          // We'll still allow the update, but warn in logs
        }
      }

      // Update member's company_id
      const { data: updatedMember, error: updateError } = await supabase
        .from('members')
        .update({
          company_id: company_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating member:', updateError);
        return res.status(500).json({ error: 'Failed to update member' });
      }

      // Get company name for response if company_id exists
      let companyName = null;
      if (company_id) {
        try {
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', company_id)
            .single();
          companyName = company?.name || null;
        } catch (companyError) {
          // Companies table might not exist yet
          console.warn('Could not fetch company name:', companyError.message);
        }
      }

      const response = {
        id: updatedMember.id,
        client_id: updatedMember.client_id,
        user_id: updatedMember.user_id,
        email: updatedMember.email,
        display_name: updatedMember.display_name,
        role: updatedMember.role,
        status: updatedMember.status,
        company_id: updatedMember.company_id,
        company_name: companyName,
        metadata: updatedMember.metadata,
        created_at: updatedMember.created_at,
        updated_at: updatedMember.updated_at
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error in PUT /api/members/[id]:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}