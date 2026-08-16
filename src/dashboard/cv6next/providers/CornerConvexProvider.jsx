import { createContext, useContext, useEffect, useState } from 'react'
import { ConvexProvider, ConvexReactClient, useMutation } from 'convex/react'
import { makeFunctionReference } from 'convex/server'
import { supabase } from '../../lib/supabase.js'

export const CORNER_CONVEX_URL = 'https://neat-pony-216.convex.cloud'
const client = new ConvexReactClient(CORNER_CONVEX_URL)
const signInRef = makeFunctionReference('users:signIn')

const IdentityContext = createContext(undefined)

function IdentityBridge({ children }) {
  const signIn = useMutation(signInRef)
  const [identity, setIdentity] = useState(undefined)

  useEffect(() => {
    let alive = true
    const resolve = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const user = data?.session?.user
        if (!user?.email) { if (alive) setIdentity(null); return }
        const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0]
        const result = await signIn({ email: user.email.toLowerCase(), name })
        if (alive) setIdentity(result || null)
      } catch {
        if (alive) setIdentity(null)
      }
    }
    resolve()
    return () => { alive = false }
  }, [signIn])

  return <IdentityContext.Provider value={identity}>{children}</IdentityContext.Provider>
}

export function CornerConvexProvider({ children }) {
  return <ConvexProvider client={client}><IdentityBridge>{children}</IdentityBridge></ConvexProvider>
}

export function useCornerConvexIdentity() {
  return useContext(IdentityContext)
}

