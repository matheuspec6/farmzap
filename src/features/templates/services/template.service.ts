import { supabase } from "@/lib/supabase"

export type MessageTemplate = {
  id: string
  name: string
  category: string
  content: string
  type: string
  status: string
  created_at: string
  updated_at: string
  last_modified: string
  sent_count: number
  open_count: number
}

export type CreateTemplateParams = {
  name: string
  category: string
  content: string
  type?: string
  status?: string
}

export type UpdateTemplateParams = Partial<CreateTemplateParams>

export const templateService = {
  async getTemplates(): Promise<MessageTemplate[]> {
    const { data, error } = await supabase
      .from("message_templates")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  },

  async getTemplateById(id: string): Promise<MessageTemplate | null> {
    const { data, error } = await supabase
      .from("message_templates")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error
    return data
  },

  async createTemplate(params: CreateTemplateParams): Promise<MessageTemplate> {
    const { data, error } = await supabase
      .from("message_templates")
      .insert({
        name: params.name,
        category: params.category,
        content: params.content,
        type: params.type || "text",
        status: params.status || "active"
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateTemplate(id: string, params: UpdateTemplateParams): Promise<MessageTemplate> {
    const { data, error } = await supabase
      .from("message_templates")
      .update({
        ...params,
        last_modified: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from("message_templates")
      .delete()
      .eq("id", id)

    if (error) throw error
  },

  async toggleStatus(id: string, currentStatus: string): Promise<MessageTemplate> {
    const newStatus = currentStatus === "active" ? "inactive" : "active"
    return this.updateTemplate(id, { status: newStatus })
  }
}
