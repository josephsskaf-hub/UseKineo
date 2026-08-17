// app/api/images/route.ts — KINEO-IMAGES-STORE-2026-08-17
// GET: galeria "My Images" do usuario logado (24 mais recentes). RLS ja
// garante que cada um so ve as proprias linhas — o filtro explicito por
// user_id e cinto e suspensorio.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ images: [] })

  const { data, error } = await supabase
    .from('images')
    .select('id,url,upscaled_url,model,prompt,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(24)

  if (error) return NextResponse.json({ images: [] })
  return NextResponse.json({ images: data ?? [] })
}
