import { supabase } from "@/lib/supabase"

export interface CampaignSettings {
  split_count: string
  message_interval: string
  ai_merge?: boolean
  instances?: string[]
  schedule_start?: string
  schedule_end?: string | null
  timezone?: string
}

export interface CreateCampaignParams {
  name: string
  start_date: Date
  end_date: Date | null
  message_template: string
  settings: CampaignSettings
}

export interface LeadInput {
  name: string
  phone: string
  original: any
}

export const campaignService = {
  async createCampaignWithLeads(campaign: CreateCampaignParams, leads: LeadInput[]) {
    // 1. Criar a campanha
    const { data: createdCampaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        name: campaign.name,
        start_date: campaign.start_date.toISOString(),
        end_date: campaign.end_date ? campaign.end_date.toISOString() : null,
        message_template: campaign.message_template,
        settings: campaign.settings,
        status: 'agendado'
      })
      .select()
      .single()

    if (campaignError) throw campaignError

    // 2. Preparar leads
    const leadsToInsert = leads.map(lead => ({
      campaign_id: createdCampaign.id,
      name: lead.name,
      phone: lead.phone,
      custom_fields: lead.original,
      status: 'pendente'
    }))

    // 3. Inserir leads (em lotes se necessário, mas Supabase aguenta bem inserções diretas até certo limite)
    // Para muitos leads, o ideal seria quebrar em chunks, mas por enquanto vamos direto.
    const { error: leadsError } = await supabase
      .from('leads')
      .insert(leadsToInsert)

    if (leadsError) {
      // Opcional: rollback da campanha se falhar os leads? 
      // Por enquanto, vamos apenas lançar o erro.
      throw leadsError
    }

    return createdCampaign
  },

  async getCampaigns() {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*, leads(count)')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async deleteCampaign(id: string) {
    const { error: campaignError } = await supabase
      .from('campaigns')
      .update({ status: 'excluido', deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (campaignError) throw campaignError
  },

  async deactivateCampaign(id: string) {
    const { error: campaignError } = await supabase
      .from('campaigns')
      .update({ status: 'cancelado' })
      .eq('id', id)
    if (campaignError) throw campaignError

    const { error: leadsError } = await supabase
      .from('leads')
      .update({ status: 'agendado' })
      .eq('campaign_id', id)
      .neq('status', 'enviado')
      .neq('status', 'falhou')
    if (leadsError) throw leadsError
  },

  async getHistoryByPhone(phone: string) {
    // Normaliza o telefone para busca (apenas números)
    const cleanPhone = phone.replace(/\D/g, "")
    
    const { data, error } = await supabase
      .from('leads')
      .select(`
        id,
        status,
        created_at,
        campaign:campaigns (
          name,
          message_template
        )
      `)
      .eq('phone', cleanPhone)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    return data.map((item: any) => ({
      id: item.id,
      campaignName: item.campaign?.name || "Campanha Desconhecida",
      message: item.campaign?.message_template || "",
      date: item.created_at,
      status: item.status
    }))
  },

  async getCampaignLeads(campaignId: string) {
    const { data, error } = await supabase
      .from('leads')
      .select('name, phone, status, sent_at, custom_fields')
      .eq('campaign_id', campaignId)
      .order('name', { ascending: true })
    
    if (error) throw error
    return data
  }
}
