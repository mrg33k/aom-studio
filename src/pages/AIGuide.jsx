import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Users, TrendingUp, LayoutGrid,
  PenTool, BarChart2, ArrowRight, ArrowLeft, Copy, Check, RotateCcw, Mail, Send,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';

const ORANGE = '#E85D26';

// ─── Category data ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'client-comms', label: 'Client Communications', icon: MessageSquare },
  { id: 'hiring',       label: 'Hiring & Team Management', icon: Users },
  { id: 'sales',        label: 'Sales & Outreach', icon: TrendingUp },
  { id: 'operations',   label: 'Operations & Organization', icon: LayoutGrid },
  { id: 'content',      label: 'Content & Marketing', icon: PenTool },
  { id: 'finance',      label: 'Finance & Reporting', icon: BarChart2 },
];

// ─── Situational questions ─────────────────────────────────────────────────
const CATEGORY_QUESTIONS = {
  'client-comms': [
    { id: 'business_type', label: 'What kind of business do you run?', placeholder: 'e.g. landscaping company, law firm, consulting agency' },
    { id: 'main_challenge', label: "What's your biggest client communication pain point?", placeholder: 'e.g. writing follow-up emails, handling difficult clients, sending project updates' },
  ],
  'hiring': [
    { id: 'business_type', label: 'What kind of business do you run?', placeholder: 'e.g. restaurant, HVAC company, marketing agency' },
    { id: 'role_hiring', label: 'What role are you currently hiring for (or want to hire for)?', placeholder: 'e.g. sales rep, office admin, delivery driver' },
  ],
  'sales': [
    { id: 'business_type', label: 'What kind of business do you run?', placeholder: 'e.g. roofing company, SaaS startup, photography studio' },
    { id: 'sales_challenge', label: 'Where does your sales process break down?', placeholder: 'e.g. not enough leads, low close rate, no follow-up system' },
  ],
  'operations': [
    { id: 'business_type', label: 'What kind of business do you run?', placeholder: 'e.g. plumbing company, dental office, e-commerce store' },
    { id: 'ops_pain', label: "What's eating the most of your time right now?", placeholder: 'e.g. scheduling, paperwork, managing my team' },
  ],
  'content': [
    { id: 'business_type', label: 'What kind of business do you run?', placeholder: 'e.g. fitness studio, real estate agency, food truck' },
    { id: 'content_platform', label: 'Where do you most want to show up online?', placeholder: 'e.g. Instagram, LinkedIn, Google, Facebook' },
  ],
  'finance': [
    { id: 'business_type', label: 'What kind of business do you run?', placeholder: 'e.g. construction company, salon, accounting firm' },
    { id: 'finance_challenge', label: "What's your biggest financial headache?", placeholder: 'e.g. chasing invoices, forecasting cash flow, understanding my numbers' },
  ],
};

// ─── Prompt data ─────────────────────────────────────────────────────────
const PROMPTS = {
  'client-comms': (answers) => [
    {
      label: 'Project Update Email',
 prompt: `Write a professional project update email for my ${answers.business_type || 'business'} to send to a client. The email should be warm but concise, summarize progress, name any blockers, and give a realistic timeline for next steps. Keep it under 150 words and end with a clear next action.`,
    },
    {
      label: 'Follow-Up Email',
      prompt: `Write a follow-up email for my ${answers.business_type || 'business'} to send to a client who hasn't responded in 5 business days. Reference our previous conversation without being pushy. Make it easy to say yes. Keep it under 100 words.`,
    },
    {
      label: 'Difficult Client Response',
      prompt: `I run a ${answers.business_type || 'business'} and a client is upset about ${answers.main_challenge || 'a project outcome'}. Write a calm, professional response that acknowledges their concern, takes responsibility where appropriate, and proposes a clear path forward. Avoid being defensive.`,
    },
    {
      label: 'Scope Change Request',
      prompt: `Write a professional email for my ${answers.business_type || 'business'} explaining to a client that their request falls outside the original project scope. Offer to quote the additional work. Be firm but keep the relationship warm.`,
    },
    {
      label: 'New Client Welcome',
      prompt: `Write a warm welcome email to send to a new client of my ${answers.business_type || 'business'}. Confirm what we're doing together, set clear expectations for communication, and make them feel confident they made the right choice. Keep it under 200 words.`,
    },
    {
      label: 'Client Check-In Message',
 prompt: `Write a short, genuine check-in message I can send to a current client of my ${answers.business_type || 'business'} who I haven't heard from in a while. The goal is to stay top of mind, show I care, and open the door for future work, without being salesy. Keep it under 75 words.`,
    },
  ],
  'hiring': (answers) => [
    {
      label: 'Job Posting',
 prompt: `Write a compelling job posting for a ${answers.role_hiring || 'team member'} at my ${answers.business_type || 'business'}. Make it feel real, describe what the role actually does day-to-day, what kind of person thrives here, and why someone would want to work for us. Avoid corporate jargon.`,
    },
    {
      label: 'Interview Questions',
      prompt: `Give me 8 interview questions for a ${answers.role_hiring || 'candidate'} at my ${answers.business_type || 'business'}. Include 2 behavioral questions, 2 situational questions, 2 skill-specific questions, and 2 culture-fit questions. For each, explain what a strong answer looks like.`,
    },
    {
      label: 'Offer Letter',
 prompt: `Write a warm, professional job offer letter for a ${answers.role_hiring || 'new hire'} at my ${answers.business_type || 'business'}. Include placeholders for salary, start date, and benefits. Keep it legally neutral, just a professional offer, not a contract.`,
    },
    {
      label: 'Rejection Email',
      prompt: `Write a respectful rejection email to send to a candidate who applied to my ${answers.business_type || 'business'} for a ${answers.role_hiring || 'position'}. Be kind, leave the door open for future roles, and don't lead them on. Keep it under 100 words.`,
    },
    {
      label: 'Onboarding Checklist',
      prompt: `Create a simple first-week onboarding checklist for a new ${answers.role_hiring || 'team member'} at my ${answers.business_type || 'business'}. Include: day 1 logistics, who to meet, tools to set up, and one small win they should accomplish in the first week.`,
    },
    {
      label: 'Performance Review Template',
      prompt: `Create a simple quarterly performance review template for a ${answers.role_hiring || 'team member'} at my ${answers.business_type || 'business'}. Include sections for: what they did well, where they need to grow, one specific goal for next quarter, and a rating scale that isn't vague. Keep it fair, honest, and easy to have a real conversation around.`,
    },
  ],
  'sales': (answers) => [
    {
      label: 'Cold Outreach Email',
      prompt: `Write a cold outreach email for my ${answers.business_type || 'business'} targeting a potential client. My biggest challenge is ${answers.sales_challenge || 'getting responses'}. Lead with a specific problem they probably have, show how we solve it, and make it easy to reply. Keep it under 120 words.`,
    },
    {
      label: 'Follow-Up Sequence',
      prompt: `Write a 3-email follow-up sequence for my ${answers.business_type || 'business'} after a sales call or proposal. Email 1: same day thank you + next step. Email 2: 3 days later with a value-add. Email 3: 7 days later, casual check-in that's easy to respond to.`,
    },
    {
      label: 'Objection Response',
 prompt: `I run a ${answers.business_type || 'business'} and a prospect said our price is too high. Write me 3 different ways to respond, one that reframes value, one that offers options, and one that digs deeper into their hesitation. Keep each under 75 words.`,
    },
    {
      label: 'Proposal Introduction',
 prompt: `Write the opening section of a business proposal for my ${answers.business_type || 'business'}. Open by mirroring back what the prospect told us they need, then transition into how we solve it. Keep it punchy, this should be 2 tight paragraphs that make them want to read more.`,
    },
    {
      label: 'Meeting Prep Brief',
 prompt: `I have a sales meeting with a potential client for my ${answers.business_type || 'business'}. Write me a pre-meeting brief template I can fill out in 10 minutes, their business, what problem they want to solve, what objections I might face, and the one outcome I'm driving toward in this meeting.`,
    },
    {
      label: 'Referral Request Script',
 prompt: `Write a script or message template I can use to ask happy clients of my ${answers.business_type || 'business'} for a referral. Make it feel natural, not transactional. Give me a version I can send by text or email, and a version I can say in person. The goal is to make asking feel like a normal, easy conversation.`,
    },
  ],
  'operations': (answers) => [
    {
      label: 'SOP Template',
      prompt: `Create a Standard Operating Procedure (SOP) template for my ${answers.business_type || 'business'} for the task of ${answers.ops_pain || 'a recurring process'}. Include: purpose, who's responsible, step-by-step instructions, tools needed, and what "done" looks like. Format it so any team member can follow it.`,
    },
    {
      label: 'Weekly Team Update',
 prompt: `Write a weekly team update template for my ${answers.business_type || 'business'}. Include: what we accomplished this week, what's in progress, what's blocked, key priorities for next week, and any decisions that need to be made. Keep it scannable, this should take 5 minutes to read.`,
    },
    {
      label: 'Delegation Brief',
      prompt: `I need to delegate ${answers.ops_pain || 'a task'} in my ${answers.business_type || 'business'}. Write a delegation brief that covers: the task and its goal, why it matters, how to do it step-by-step, the deadline, who to go to with questions, and what a successful outcome looks like.`,
    },
    {
      label: 'Meeting Agenda',
      prompt: `Create a reusable weekly team meeting agenda template for my ${answers.business_type || 'business'}. The meeting should be 30 minutes max. Include time blocks for: a quick win share, key metrics review, current blockers, priorities for the week, and one thing each person commits to.`,
    },
    {
      label: 'Process Audit Prompt',
      prompt: `I run a ${answers.business_type || 'business'} and want to identify where I'm wasting the most time. Ask me 10 diagnostic questions that will help me spot the processes that should be automated, delegated, or eliminated. Format as a numbered list I can work through one by one.`,
    },
    {
      label: 'Hiring vs. Systemizing',
      prompt: `I run a ${answers.business_type || 'business'} and I'm spending too much time on ${answers.ops_pain || 'day-to-day operations'}. Help me figure out whether I should hire someone, build a system to handle it, or automate it. Ask me 5 questions that will make the right answer obvious.`,
    },
  ],
  'content': (answers) => [
    {
      label: 'Social Media Caption',
      prompt: `Write 3 ${answers.content_platform || 'social media'} captions for my ${answers.business_type || 'business'}. One should be educational (share a tip), one should be behind-the-scenes, and one should drive people to reach out. Each should be conversational, specific to my industry, and end with a question or call-to-action.`,
    },
    {
      label: 'Content Ideas (30-Day)',
      prompt: `Give me 30 content ideas for my ${answers.business_type || 'business'} to post on ${answers.content_platform || 'social media'}. Mix educational posts, behind-the-scenes, client results, myth-busting, and direct offers. Keep each idea to one sentence so I can quickly decide what to create.`,
    },
    {
      label: 'Case Study Write-Up',
 prompt: `Write a short case study for my ${answers.business_type || 'business'} using this format: Problem → What we did → Result. I'll fill in the specifics, just give me the structure and example language. Keep it punchy, under 250 words, and written in a way I can post online or send to prospects.`,
    },
    {
      label: 'Email Newsletter',
      prompt: `Write a monthly email newsletter for my ${answers.business_type || 'business'}. Include: a short personal note from me, one useful tip for our audience, one piece of business news or update, and a clear call-to-action. Keep the whole thing under 300 words and make it feel like it came from a real person.`,
    },
    {
      label: 'Bio / About Section',
      prompt: `Write a compelling About section for my ${answers.business_type || 'business'} to use on our website and ${answers.content_platform || 'social media'}. Lead with what we do and who we help. Include what makes us different and what a client can expect when they work with us. Keep it under 150 words and write it in first person.`,
    },
    {
      label: 'Google Review Request',
 prompt: `Write a short, natural message I can send to happy clients of my ${answers.business_type || 'business'} asking them to leave a Google review. Give me 3 versions, one for text, one for email, and one for in-person. Make it easy to say yes and include a placeholder where I'll put the direct review link.`,
    },
  ],
  'finance': (answers) => [
    {
      label: 'Invoice Follow-Up Email',
      prompt: `Write an invoice follow-up email for my ${answers.business_type || 'business'} to send to a client with a payment that's 14 days overdue. Be professional and direct, not passive aggressive. Include a clear payment link placeholder and a firm but friendly deadline.`,
    },
    {
      label: 'Cash Flow Forecast Prompt',
 prompt: `I run a ${answers.business_type || 'business'} and I'm trying to get a handle on my cash flow. Give me a list of the 10 questions I should be able to answer cold about my business finances, the ones that separate business owners who have control from those who are guessing.`,
    },
    {
      label: 'Pricing Script',
      prompt: `I run a ${answers.business_type || 'business'} and my challenge is ${answers.finance_challenge || 'pricing my services'}. Write me a script for how to present and justify my prices during a sales conversation. I want to sound confident, not defensive. Include how to handle "that's more than I expected."`,
    },
    {
      label: 'Expense Review Prompt',
 prompt: `I want to review my business expenses for my ${answers.business_type || 'business'} and find where I'm overspending. Give me a structured process to audit my last 3 months of expenses, what to look for, what categories to question, and what questions to ask about each line item.`,
    },
    {
      label: 'Financial Report Summary',
      prompt: `Write a simple monthly financial summary template for my ${answers.business_type || 'business'} that I can use to understand where things stand. Include: revenue vs last month, biggest expense categories, profit margin estimate, and one financial decision I should make this month based on the numbers.`,
    },
    {
      label: 'Price Increase Letter',
 prompt: `I need to raise my prices at my ${answers.business_type || 'business'}. Write a professional but warm email to send to existing clients announcing the change. Acknowledge the relationship, explain the reason briefly without over-apologizing, give them enough notice, and make it feel respectful, not like a form letter.`,
    },
  ],
};

// ─── AOM Insights ──────────────────────────────────────────────────────────
// Each insight is personalized based on what the user typed. Priority order:
// specific keyword matches → raw input echo-back → generic fallback.
const AOM_INSIGHTS = {
  'client-comms': (answers) => {
    const challenge = (answers.main_challenge || '').toLowerCase();
    const biz = answers.business_type || 'business';
    const rawChallenge = (answers.main_challenge || '').trim();

    if (challenge.includes('follow')) {
 return `At your ${biz}, a missed follow-up isn't just a lost opportunity, it's a signal to the client that they're not a priority. The businesses that keep clients longest communicate consistently, not just when there's a problem. The prompts below help you build that habit without it taking over your day. Looking ahead, AOM`;
    }
    if (challenge.includes('difficult') || challenge.includes('complaint') || challenge.includes('unhappy') || challenge.includes('angry') || challenge.includes('upset')) {
      return `Difficult client conversations reveal more about a ${biz} than any of the easy ones. The way you respond in those moments shapes your reputation more than your work quality does. The prompts below give you the right words so you never have to improvise when someone's upset. Looking ahead, AOM`;
    }
    if (challenge.includes('update') || challenge.includes('progress') || challenge.includes('status') || challenge.includes('communication')) {
 return `Clients don't need to hear from you every day, they need to feel like they know what's happening. At your ${biz}, regular proactive updates prevent the anxious check-ins and last-minute texts that break your focus. The prompts below help you communicate on your schedule, not theirs. Looking ahead, AOM`;
    }
    if (challenge.includes('scope') || challenge.includes('boundary') || challenge.includes('extra') || challenge.includes('change')) {
 return `Scope creep at a ${biz} is almost never about the work itself, it's about what was and wasn't made clear at the start. Clients push past boundaries when the boundaries were never clearly drawn. The prompts below help you set expectations the right way from day one. Looking ahead, AOM`;
    }
    if (challenge.includes('welcome') || challenge.includes('new client') || challenge.includes('onboard') || challenge.includes('first')) {
 return `The first 48 hours after signing a new client sets the tone for everything that follows at your ${biz}. Most client anxiety that surfaces months into a project traces back to that first moment, what you said, how quickly you responded, how clearly you laid out the plan. The prompts below help you nail that first impression every time. Looking ahead, AOM`;
    }
    if (rawChallenge) {
 return `"${rawChallenge}" is a problem most ${biz} owners hit, and the fix is almost always about communication habits, not the work itself. When clients feel informed and valued, the relationship takes care of itself. The prompts below give you the words to make that happen consistently. Looking ahead, AOM`;
    }
 return `At your ${biz}, client relationships are the foundation everything else is built on. The businesses that get this right communicate with intention, not more often, just smarter. The prompts below give you the words to do exactly that. Looking ahead, AOM`;
  },

  'hiring': (answers) => {
    const role = (answers.role_hiring || '').toLowerCase();
    const biz = answers.business_type || 'business';
    const rawRole = (answers.role_hiring || '').trim();

    if (role.includes('sales') || role.includes('rep') || role.includes('business development') || role.includes('bd')) {
 return `Hiring a sales rep for your ${biz} is one of the highest-stakes decisions you'll make, the wrong person can cost you clients, not just time. The prompts below help you screen for the right mindset, not just the right resume, so you hire someone who'll actually close and protect the business you've built. Looking ahead, AOM`;
    }
    if (role.includes('admin') || role.includes('office') || role.includes('assistant') || role.includes('coordinator')) {
 return `A great admin or office person can give you back hours every week at your ${biz}, but only if they're set up to succeed from day one. The prompts below help you define exactly what you need, attract the right candidates, and get them productive fast without it falling all on you. Looking ahead, AOM`;
    }
    if (role.includes('manager') || role.includes('supervisor') || role.includes('lead') || role.includes('director')) {
 return `Bringing in a manager at your ${biz} isn't just filling a role, it's building a layer of leadership that reflects your standards every single day. The prompts below help you hire someone who'll protect the culture you've worked to build and make the team run better than it does without them. Looking ahead, AOM`;
    }
    if (role.includes('driver') || role.includes('delivery') || role.includes('field') || role.includes('tech') || role.includes('technician') || role.includes('installer')) {
 return `At your ${biz}, field and technical roles are the face of the business, every job site, every service call is a direct reflection of your standard. The prompts below help you hire for the qualities that actually matter in those roles, not just the ones that look good on paper. Looking ahead, AOM`;
    }
    if (rawRole) {
 return `Finding the right ${rawRole} for your ${biz} isn't just about filling a seat, it's about finding someone who raises the standard of everything they touch. The prompts below cover the full hiring process so you can bring the right person in with confidence the first time. Looking ahead, AOM`;
    }
 return `A ${biz} rises or falls on the team behind it. Finding the right person isn't just about filling a seat, it's about protecting the standard you've built. The prompts below cover every stage of the process so you can hire with confidence. Looking ahead, AOM`;
  },

  'sales': (answers) => {
    const challenge = (answers.sales_challenge || '').toLowerCase();
    const biz = answers.business_type || 'business';
    const rawChallenge = (answers.sales_challenge || '').trim();

    if (challenge.includes('close') || challenge.includes('convert') || challenge.includes('close rate')) {
 return `For your ${biz}, the problem isn't getting in front of people, it's converting warm conversations into paid work. That gap between interest and commitment almost always comes down to trust, timing, and the right words at the right moment. The prompts below help you close that gap consistently, not just occasionally. Looking ahead, AOM`;
    }
    if (challenge.includes('lead') || challenge.includes('prospect') || challenge.includes('not enough') || challenge.includes('pipeline')) {
 return `The challenge for your ${biz} isn't that people don't want what you offer, it's that they're not finding you consistently enough. Lead generation isn't magic, it's a repeatable system, and once it's running it works whether you're thinking about it or not. The prompts below will help you build that system from the ground up. Looking ahead, AOM`;
    }
    if (challenge.includes('follow') || challenge.includes('follow-up')) {
 return `Most deals at a ${biz} are lost in the follow-up, not because prospects aren't interested, but because life gets in the way and nobody reconnected. The right follow-up sequence turns a cold trail into a closed deal. The prompts below give you that sequence, start to finish. Looking ahead, AOM`;
    }
    if (challenge.includes('ghost') || challenge.includes('ghosted') || challenge.includes('ignored') || challenge.includes('no reply') || challenge.includes('no response')) {
 return `Getting ghosted after a proposal at your ${biz} usually means the prospect left the conversation before fully understanding the value, not that they weren't interested. The fix isn't chasing harder, it's re-engaging with something worth responding to. The prompts below help you do that. Looking ahead, AOM`;
    }
    if (challenge.includes('price') || challenge.includes('expensive') || challenge.includes('budget') || challenge.includes('cost') || challenge.includes('too much')) {
 return `When prospects at your ${biz} push back on price, they're usually not comparing numbers, they're questioning whether the outcome is real for them specifically. The businesses that win on price don't discount, they reframe. The prompts below give you the language to do that without flinching. Looking ahead, AOM`;
    }
    if (challenge.includes('referral') || challenge.includes('word of mouth') || challenge.includes('networking')) {
 return `Referral-based businesses like your ${biz} have the highest close rates and the most loyal clients, but most owners leave a huge portion of that pipeline untapped because they never built a system for asking. The prompts below help you make referrals a reliable, repeatable part of your growth. Looking ahead, AOM`;
    }
    if (rawChallenge) {
 return `"${rawChallenge}" is one of the most common sticking points for a ${biz}, and it almost always has a cleaner fix than it looks like from the inside. The prompts below will help you diagnose the gap and give you the exact language to close it. Looking ahead, AOM`;
    }
 return `Most ${biz}s don't have a sales problem, they have a consistency problem. Whatever's breaking down in your pipeline is fixable with the right words and the right sequence. The prompts below give you both. Looking ahead, AOM`;
  },

  'operations': (answers) => {
    const pain = (answers.ops_pain || '').toLowerCase();
    const biz = answers.business_type || 'business';
    const rawPain = (answers.ops_pain || '').trim();

    if (pain.includes('schedul') || pain.includes('calendar') || pain.includes('booking') || pain.includes('appointment')) {
      return `When scheduling is eating your time at your ${biz}, you're spending energy on logistics instead of the work that actually moves the business forward. Every hour you get back from calendar chaos is an hour you can put into growth. The prompts below help you systematize that so it stops running your day. Looking ahead, AOM`;
    }
    if (pain.includes('paper') || pain.includes('admin') || pain.includes('document') || pain.includes('forms')) {
 return `Paperwork and admin are the invisible tax on every ${biz}, they don't feel productive, but they can't be ignored. The owners who break free don't eliminate admin, they systematize it so it takes minutes instead of hours. The prompts below will help you build that system. Looking ahead, AOM`;
    }
    if (pain.includes('team') || pain.includes('staff') || pain.includes('manag') || pain.includes('employee') || pain.includes('people')) {
 return `Managing people is one of the hardest parts of running a ${biz}, and it's rarely what you signed up for. The owners who get it right build clear communication habits and systems that let the team function without constant input from you. The prompts below help you build those habits. Looking ahead, AOM`;
    }
    if (pain.includes('invoice') || pain.includes('billing') || pain.includes('payment') || pain.includes('collect')) {
 return `Billing and invoicing at your ${biz} shouldn't be a second job, but for most owners it becomes one. The fix is building a process where money follows a clear path, not one where you have to chase it down every time. The prompts below help you set that up. Looking ahead, AOM`;
    }
    if (pain.includes('email') || pain.includes('message') || pain.includes('respond') || pain.includes('inbox')) {
 return `When communication is eating your day at your ${biz}, the issue is usually a lack of structure, not a lack of time. The owners who tame their inbox build habits around when and how they respond, not just how fast. The prompts below help you take back control of that. Looking ahead, AOM`;
    }
    if (rawPain) {
 return `"${rawPain}" is one of the most common places ${biz} owners get stuck, and it's almost always a systems problem disguised as a time problem. The prompts below will help you diagnose it and build a process that works without you having to babysit it. Looking ahead, AOM`;
    }
    return `When day-to-day operations are taking over your time at your ${biz}, you're running the business instead of building it. The owners who break out of that cycle build systems that work without them. The prompts below are your starting point. Looking ahead, AOM`;
  },

  'content': (answers) => {
    const platform = (answers.content_platform || '').toLowerCase();
    const biz = answers.business_type || 'business';
    const rawPlatform = (answers.content_platform || '').trim();

    if (platform.includes('instagram') || platform.includes('ig') || platform.includes('reels')) {
 return `Instagram rewards consistency and real storytelling, which makes it one of the best channels for a ${biz} that does visible work. The secret isn't posting every day, it's posting with a clear point each time. The prompts below help you build a content system that looks effortless even when it isn't. Looking ahead, AOM`;
    }
    if (platform.includes('linkedin')) {
 return `LinkedIn is where buyers and referral partners decide whether to trust a ${biz} before they ever make contact. The businesses that win there aren't the loudest, they're the most credible. The prompts below help you build that presence without sounding like everyone else on the platform. Looking ahead, AOM`;
    }
    if (platform.includes('google') || platform.includes('seo') || platform.includes('search') || platform.includes('website')) {
 return `Google is where your future clients go when they're ready to buy, which makes it the highest-intent channel for your ${biz}. Getting found there isn't about gaming an algorithm, it's about showing up consistently with content that answers the questions your clients are already asking. The prompts below help you do that. Looking ahead, AOM`;
    }
    if (platform.includes('facebook') || platform.includes('fb')) {
 return `Facebook still reaches a wide local audience, especially for a ${biz} where community trust and word-of-mouth are the main drivers. The prompts below help you show up there in a way that feels authentic to your business and your market, not like a corporate broadcast. Looking ahead, AOM`;
    }
    if (platform.includes('tiktok') || platform.includes('video') || platform.includes('youtube')) {
 return `Short-form video is the fastest way for a ${biz} to build trust with people who've never heard of you. The barrier isn't production quality, it's showing up consistently with content that demonstrates your expertise in real ways. The prompts below help you plan and create that content without it becoming a second job. Looking ahead, AOM`;
    }
    if (platform.includes('email') || platform.includes('newsletter')) {
 return `Email marketing for a ${biz} is the one channel you actually own, no algorithm shifts, no account bans, no declining reach. A consistent newsletter builds a warm audience that's ready to buy when you ask them. The prompts below help you write one that people actually open and read. Looking ahead, AOM`;
    }
    if (rawPlatform) {
 return `For a ${biz}, showing up consistently on ${rawPlatform} is the difference between being found and being invisible. The businesses that win at content don't post more, they post with a clear purpose every single time. The prompts below help you build that discipline. Looking ahead, AOM`;
    }
 return `For a ${biz}, consistent content is the difference between being found and being invisible. The businesses that win online don't post more, they post with intention. The prompts below give you a full system to do the same. Looking ahead, AOM`;
  },

  'finance': (answers) => {
    const challenge = (answers.finance_challenge || '').toLowerCase();
    const biz = answers.business_type || 'business';
    const rawChallenge = (answers.finance_challenge || '').trim();

    if (challenge.includes('invoice') || challenge.includes('collect') || challenge.includes('chasing') || challenge.includes('paid') || challenge.includes('overdue')) {
 return `Chasing invoices at your ${biz} isn't just frustrating, it's a cash flow problem that compounds over time. The real fix isn't just better follow-up; it's setting the right payment expectations before work begins so the awkward chase never has to happen. The prompts below help you get paid faster with less friction. Looking ahead, AOM`;
    }
    if (challenge.includes('cash') || challenge.includes('flow') || challenge.includes('runway') || challenge.includes('tight')) {
 return `Cash flow uncertainty is one of the most stressful parts of running a ${biz}, it makes every decision feel risky when it doesn't need to. The owners who manage it well don't predict the future, they build enough visibility to see problems coming in time to act. The prompts below help you build that clarity. Looking ahead, AOM`;
    }
    if (challenge.includes('forecast') || challenge.includes('predict') || challenge.includes('plan') || challenge.includes('budget')) {
 return `Forecasting for a ${biz} doesn't have to be complicated, it just needs to be consistent. A simple monthly snapshot is enough to spot patterns, catch problems early, and make better decisions before you're backed into a corner. The prompts below help you build that habit. Looking ahead, AOM`;
    }
    if (challenge.includes('number') || challenge.includes('understand') || challenge.includes('profit') || challenge.includes('margin')) {
 return `You don't need to be a finance expert to run a profitable ${biz}, you just need to understand the three or four numbers that actually drive everything else. Margin, cash position, and revenue trend are what separate owners who feel in control from those who are guessing. The prompts below get you there. Looking ahead, AOM`;
    }
    if (challenge.includes('price') || challenge.includes('pricing') || challenge.includes('rate') || challenge.includes('charge') || challenge.includes('undercharge')) {
 return `Pricing is one of the hardest things to get right at a ${biz}, undercharge and you're trading time for nothing, but charging what you're worth without confidence and you lose deals you should win. The prompts below help you develop the language and the logic to price with conviction and defend it when you're challenged. Looking ahead, AOM`;
    }
    if (challenge.includes('overhead') || challenge.includes('expense') || challenge.includes('cost') || challenge.includes('spending') || challenge.includes('overspend')) {
 return `At your ${biz}, expenses tend to grow alongside revenue, which means profit doesn't always keep up with sales. The owners who stay profitable are the ones who review costs with intention, not just when something feels off. The prompts below help you build that discipline before it becomes a problem. Looking ahead, AOM`;
    }
    if (rawChallenge) {
 return `"${rawChallenge}" is a challenge most ${biz} owners hit at some point, and it almost always has a cleaner fix than it first appears. Financial clarity is closer than it seems. The prompts below will help you get there one concrete step at a time. Looking ahead, AOM`;
    }
 return `The most successful ${biz} owners aren't finance experts, they're people who understand their numbers well enough to make confident decisions. Financial clarity is closer than you think, and the prompts below will get you there. Looking ahead, AOM`;
  },
};

// ─── AOM Insight card ──────────────────────────────────────────────────────
function AOMInsightCard({ text }) {
  const SIGNATURE = 'Looking ahead, AOM';
  const sigIndex = text.lastIndexOf(SIGNATURE);
  const body = sigIndex !== -1 ? text.slice(0, sigIndex).trimEnd() : text;
  const hasSig = sigIndex !== -1;

  return (
    <div
      className="rounded-xl px-6 py-5 mb-8"
      style={{
        background: 'rgba(232,93,38,0.05)',
        borderLeft: '3px solid #E85D26',
      }}
    >
      <span
        className="block font-headline text-xs tracking-widest mb-3"
        style={{ color: '#E85D26' }}
      >
        FROM AOM
      </span>
      <p className="font-body text-base text-[#0C0C0C] leading-relaxed">
        {body}
      </p>
      {hasSig && (
        <p
          className="font-body text-base text-[#0C0C0C] leading-relaxed mt-4"
          style={{ paddingLeft: '1.5rem' }}
        >
          {SIGNATURE}
        </p>
      )}
    </div>
  );
}

// ─── Progress dots ─────────────────────────────────────────────────────────
function ProgressDots({ step, total }) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: i === step ? 28 : 8,
            background: i <= step ? ORANGE : 'rgba(0,0,0,0.12)',
          }}
        />
      ))}
      <span className="ml-2 font-body text-xs text-black/35">
        Step {step + 1} of {total}
      </span>
    </div>
  );
}

// ─── Prompt card ───────────────────────────────────────────────────────────
function PromptCard({ label, prompt }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div
      className="rounded-xl p-5 space-y-3 flex flex-col"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}
    >
      <div className="font-headline text-sm text-[#0C0C0C]">{label}</div>
      <p className="font-body text-sm text-black/60 leading-relaxed flex-1">{prompt}</p>
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body font-semibold transition-all duration-150"
          style={{
            background: copied ? 'rgba(74,222,128,0.12)' : `rgba(232,93,38,0.12)`,
            color: copied ? '#4ade80' : ORANGE,
            border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'rgba(232,93,38,0.25)'}`,
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied ✓' : 'Copy prompt'}
        </button>
        <span className="font-body text-xs text-black/35">Use this in ChatGPT or Claude →</span>
      </div>
    </div>
  );
}

// ─── Step 0: Welcome ────────────────────────────────────────────────────────
function StepWelcome({ onNext }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="max-w-2xl mx-auto text-center py-20"
    >
      <span
        className="inline-block text-xs font-body font-semibold tracking-widest mb-6 px-3 py-1 rounded-full"
        style={{ background: 'rgba(232,93,38,0.12)', color: ORANGE }}
      >
        FREE INTERACTIVE TOOL
      </span>
      <h1 className="font-display-serif text-5xl md:text-6xl text-[#0C0C0C] leading-tight mb-5">
        Find out exactly how<br />
        <span style={{ color: ORANGE }}>AI can help your business.</span>
      </h1>
      <p className="font-body text-lg text-black/55 mb-10 leading-relaxed max-w-xl mx-auto">
        Answer a few questions. Walk away with AI prompts you can actually use today.
      </p>
      <motion.button
        onClick={onNext}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl font-headline text-base tracking-wide"
        style={{ background: ORANGE, color: '#fff' }}
      >
        Let&apos;s find out
        <ArrowRight size={18} />
      </motion.button>
    </motion.div>
  );
}

// ─── Step 1: Category picker ────────────────────────────────────────────────
function StepCategory({ onNext, onBack, initialSelected }) {
  const [selected, setSelected] = useState(initialSelected || null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      <ProgressDots step={0} total={3} />
      <h2 className="font-display-serif text-3xl md:text-4xl text-[#0C0C0C] mb-2 leading-snug">
        What&apos;s your biggest challenge right now?
      </h2>
      <p className="font-body text-black/45 mb-8">Pick the one that fits best.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {CATEGORIES.map(({ id, label, icon: Icon }) => {
          const isSelected = selected === id;
          return (
            <motion.button
              key={id}
              onClick={() => setSelected(id)}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.15 }}
              className="text-left p-5 rounded-xl transition-all duration-200"
              style={{
                background: isSelected ? 'rgba(232,93,38,0.08)' : '#fff',
                border: isSelected ? `1.5px solid ${ORANGE}` : '1px solid rgba(0,0,0,0.1)',
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ background: isSelected ? `rgba(232,93,38,0.15)` : 'rgba(0,0,0,0.05)' }}
              >
                <Icon size={20} style={{ color: isSelected ? ORANGE : 'rgba(0,0,0,0.35)' }} />
              </div>
              <span
                className="font-headline text-base"
                style={{ color: isSelected ? ORANGE : 'rgba(0,0,0,0.65)' }}
              >
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl font-body text-sm text-black/45 hover:text-black/70 transition-colors duration-200"
          >
            <ArrowLeft size={15} />
            Back
          </button>
        )}
        <button
          onClick={() => selected && onNext(selected)}
          disabled={!selected}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-headline text-sm tracking-wide transition-all duration-200"
          style={{
            background: selected ? ORANGE : 'rgba(0,0,0,0.06)',
            color: selected ? '#fff' : 'rgba(0,0,0,0.25)',
            cursor: selected ? 'pointer' : 'not-allowed',
          }}
        >
          Continue
          <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Step 2: Questions ──────────────────────────────────────────────────────
function StepQuestions({ category, onNext, onBack, initialAnswers, onAnswerChange }) {
  const questions = CATEGORY_QUESTIONS[category] || [];
  const [answers, setAnswers] = useState(initialAnswers || {});

  const allFilled = questions.every((q) => (answers[q.id] || '').trim().length > 0);

  function handleChange(id, value) {
    setAnswers((prev) => {
      const next = { ...prev, [id]: value };
      onAnswerChange?.(next); // propagate partial answers up so Back → Forward doesn't wipe them
      return next;
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      <ProgressDots step={1} total={3} />
      <h2 className="font-display-serif text-3xl md:text-4xl text-[#0C0C0C] mb-2 leading-snug">
        Tell us a little about your situation.
      </h2>
      <p className="font-body text-black/45 mb-8">
        Your answers get woven directly into the prompts.
      </p>

      <div className="space-y-6 max-w-xl mb-8">
        {questions.map((q) => (
          <div key={q.id}>
            <label className="block font-headline text-sm text-[#0C0C0C] mb-2">{q.label}</label>
            <input
              type="text"
              value={answers[q.id] || ''}
              onChange={(e) => handleChange(q.id, e.target.value)}
              placeholder={q.placeholder}
              className="w-full rounded-xl px-4 py-3 font-body text-sm text-[#0C0C0C] placeholder:text-black/30 outline-none transition-all duration-200"
              style={{
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.15)',
              }}
              onFocus={(e) => { e.target.style.borderColor = ORANGE; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(0,0,0,0.15)'; }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl font-body text-sm text-black/45 hover:text-black/70 transition-colors duration-200"
          >
            <ArrowLeft size={15} />
            Back
          </button>
        )}
        <button
          onClick={() => allFilled && onNext(answers)}
          disabled={!allFilled}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-headline text-sm tracking-wide transition-all duration-200"
          style={{
            background: allFilled ? ORANGE : 'rgba(0,0,0,0.06)',
            color: allFilled ? '#fff' : 'rgba(0,0,0,0.25)',
            cursor: allFilled ? 'pointer' : 'not-allowed',
          }}
        >
          Get my prompts
          <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Step 3: Prompts ────────────────────────────────────────────────────────
function StepPrompts({ category, answers, onNext, onBack }) {
  const promptList = PROMPTS[category]?.(answers) || [];
  const insightText = AOM_INSIGHTS[category]?.(answers);
  const [email, setEmail] = useState('');
  const [emailState, setEmailState] = useState('idle'); // idle | loading | sent | error
  const [ctaHovered, setCtaHovered] = useState(false);
  const [ctaPressed, setCtaPressed] = useState(false);

  const validEmail = email.trim().length > 3 && email.includes('@') && email.includes('.');

  async function handleEmailSubmit() {
    if (!validEmail || emailState === 'loading' || emailState === 'sent') return;
    setEmailState('loading');
    try {
      const res = await fetch('/api/guide-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          category,
          prompts: promptList.map((p) => ({ label: p.label, prompt: p.prompt })),
        }),
      });
      if (res.ok) setEmailState('sent');
      else setEmailState('error');
    } catch {
      setEmailState('error');
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      <ProgressDots step={2} total={3} />
      {insightText && <AOMInsightCard text={insightText} />}

      {/* Email capture — moved above prompts so users commit before seeing all the goods */}
      <div
        className="rounded-xl p-8 mb-8"
        style={{ background: '#fff', border: '2px solid rgba(232,93,38,0.25)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Mail size={16} style={{ color: ORANGE }} />
          <h3 className="font-headline text-lg text-[#0C0C0C]">
            Get ALL these prompts sent to you
          </h3>
        </div>
        <p className="font-body text-base text-black/65 mb-5 leading-relaxed">
          Enter your email and we&apos;ll send every single one of your personalized prompts directly to your inbox — all of them, ready to use.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailState === 'error') setEmailState('idle');
            }}
            placeholder="you@yourcompany.com"
            disabled={emailState === 'sent' || emailState === 'loading'}
            className="flex-1 rounded-xl px-4 py-4 font-body text-base text-[#0C0C0C] placeholder:text-black/30 outline-none transition-all duration-200"
            style={{
              background: '#fff',
              border: '2px solid rgba(0,0,0,0.15)',
              opacity: emailState === 'sent' ? 0.6 : 1,
            }}
            onFocus={(e) => { e.target.style.borderColor = ORANGE; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(0,0,0,0.15)'; }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && validEmail && emailState === 'idle') {
                handleEmailSubmit();
              }
            }}
          />
          <button
            onClick={handleEmailSubmit}
            disabled={!validEmail || emailState === 'loading' || emailState === 'sent'}
            className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-headline text-base tracking-wide transition-all duration-200 whitespace-nowrap"
            style={{
              background: emailState === 'sent'
                ? 'rgba(74,222,128,0.15)'
                : validEmail && emailState !== 'loading' ? ORANGE : 'rgba(0,0,0,0.06)',
              color: emailState === 'sent'
                ? '#16a34a'
                : validEmail && emailState !== 'loading' ? '#fff' : 'rgba(0,0,0,0.25)',
              border: emailState === 'sent' ? '1px solid rgba(74,222,128,0.3)' : 'none',
              cursor: validEmail && emailState === 'idle' ? 'pointer' : 'default',
            }}
          >
            {emailState === 'loading' && (
              <>
                <Send size={14} />
                Sending...
              </>
            )}
            {emailState === 'sent' && (
              <>
                <Check size={14} />
                Sent! Check your inbox.
              </>
            )}
            {(emailState === 'idle' || emailState === 'error') && (
              <>
                Send me all my prompts
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>

        <div className="mt-3 min-h-[18px]">
          {emailState === 'error' && (
            <p className="font-body text-xs" style={{ color: '#dc2626' }}>
              Something went wrong — try again.
            </p>
          )}
          {emailState !== 'error' && (
            <p className="font-body text-xs text-black/35">
              No spam. Just your prompts.
            </p>
          )}
        </div>
      </div>

      <h2 className="font-display-serif text-3xl md:text-4xl text-[#0C0C0C] mb-2 leading-snug">
        Your personalized prompts.
      </h2>
      <p className="font-body text-black/45 mb-8">
        Copy any of these directly into ChatGPT or Claude.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {promptList.map((p) => (
          <PromptCard key={p.label} label={p.label} prompt={p.prompt} />
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 mt-2">
        <button
          onClick={onNext}
          onMouseEnter={() => setCtaHovered(true)}
          onMouseLeave={() => { setCtaHovered(false); setCtaPressed(false); }}
          onMouseDown={() => setCtaPressed(true)}
          onMouseUp={() => setCtaPressed(false)}
          className="inline-flex items-center justify-center gap-3 w-full max-w-md px-10 py-5 rounded-2xl font-headline text-lg tracking-wide select-none"
          style={{
            background: ORANGE,
            color: '#fff',
            boxShadow: ctaHovered
              ? '0 8px 32px rgba(232,93,38,0.45)'
              : '0 4px 18px rgba(232,93,38,0.3)',
            transform: ctaPressed
              ? 'scale(0.97) translateY(1px)'
              : ctaHovered
                ? 'scale(1.025) translateY(-2px)'
                : 'scale(1) translateY(0)',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            cursor: 'pointer',
          }}
        >
          Want AI across your whole business?
          <ArrowRight size={18} />
        </button>
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-body text-sm text-black/40 hover:text-black/65 transition-colors duration-200"
          >
            <ArrowLeft size={14} />
            Change my answers
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Step 4: CTA ────────────────────────────────────────────────────────────
function StepCTA({ onReset }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="max-w-2xl mx-auto text-center py-16"
    >
      <h2 className="font-display-serif text-4xl md:text-5xl text-[#0C0C0C] leading-tight mb-5">
        Want AI working across<br />
        <span style={{ color: ORANGE }}>your whole business?</span>
      </h2>
      <p className="font-body text-lg text-black/55 mb-10 leading-relaxed">
        The AI Flow is a deep dive into your entire operation — we find every place AI can
        save you time, money, or headcount, and hand you a custom roadmap.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <motion.button
          onClick={() => navigate('/book')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl font-headline text-base tracking-wide"
          style={{ background: ORANGE, color: '#fff' }}
        >
          Book an AI Flow
          <ArrowRight size={18} />
        </motion.button>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-body text-sm text-black/40 hover:text-black/70 transition-colors duration-200"
        >
          <RotateCcw size={14} />
          Start over
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function AIGuide() {
  const [step, setStep] = useState(-1); // -1 = welcome
  const [category, setCategory] = useState(null);
  const [answers, setAnswers] = useState(null);
  const [partialAnswers, setPartialAnswers] = useState(null); // preserves typed text when navigating Back

  function reset() {
    setStep(-1);
    setCategory(null);
    setAnswers(null);
    setPartialAnswers(null);
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF9', color: '#0C0C0C' }}>
      <SiteNav />

      <div className="pt-28 pb-24 px-6 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {step === -1 && (
            <StepWelcome key="welcome" onNext={() => setStep(0)} />
          )}
          {step === 0 && (
            <StepCategory
              key="category"
              initialSelected={category}
              onBack={() => setStep(-1)}
              onNext={(cat) => {
                setCategory(cat);
                setStep(1);
              }}
            />
          )}
          {step === 1 && (
            <StepQuestions
              key="questions"
              category={category}
              initialAnswers={answers || partialAnswers}
              onAnswerChange={setPartialAnswers}
              onBack={() => setStep(0)}
              onNext={(ans) => {
                setAnswers(ans);
                setPartialAnswers(ans);
                setStep(2);
              }}
            />
          )}
          {step === 2 && (
            <StepPrompts
              key="prompts"
              category={category}
              answers={answers}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <StepCTA key="cta" onReset={reset} />
          )}
        </AnimatePresence>
      </div>

      <SiteFooter />
    </div>
  );
}