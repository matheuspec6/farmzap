import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Exemplo de query simples - substitua 'users' pela sua tabela real
    // const { data, error } = await supabase.from('users').select('*').limit(5)
    
    // Como ainda não temos chaves reais configuradas, vamos retornar uma mensagem de sucesso simulada
    // Se tiver chaves, descomente a linha acima e use data/error
    
    return NextResponse.json({ 
      message: 'API route functioning correctly',
      supabaseConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
