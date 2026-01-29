import { supabase } from "@/lib/supabase"

export interface GroupLeadInput {
  name: string
  phone: string
  original?: any
}

export const leadsService = {
  async createGroup(name: string, leads: GroupLeadInput[]) {
    const { data: group, error: groupErr } = await supabase
      .from("lead_groups")
      .insert({ name })
      .select()
      .single()
    if (groupErr) throw groupErr

    if (Array.isArray(leads) && leads.length) {
      const seen = new Set<string>()
      const rows = leads
        .map((l) => {
          const name = String(l.name ?? "").trim()
          const phoneRaw = String(l.phone ?? "").trim()
          const phone = phoneRaw.replace(/\D+/g, "")
          return {
            group_id: group.id,
            name,
            phone,
            custom_fields: l.original ?? null,
          }
        })
        .filter((r) => {
          if (!r.phone) return false
          if (seen.has(r.phone)) return false
          seen.add(r.phone)
          return true
        })
      if (rows.length) {
        const { error: leadsErr } = await supabase
          .from("group_leads")
          .upsert(rows, { onConflict: "group_id,phone", ignoreDuplicates: true })
        if (leadsErr) throw leadsErr
      }
    }
    return group
  },

  async getGroups() {
    const { data, error } = await supabase
      .from("lead_groups")
      .select("id, name, created_at, group_leads(count)")
      .order("created_at", { ascending: false })
    if (error) throw error
    return data
  },

  async deleteGroup(id: string) {
    const { error } = await supabase
      .from("lead_groups")
      .delete()
      .eq("id", id)
    if (error) throw error
  },

  async updateGroupName(id: string, name: string) {
    const { error } = await supabase
      .from("lead_groups")
      .update({ name })
      .eq("id", id)
    if (error) throw error
  },

  async getGroup(id: string) {
    const { data, error } = await supabase
      .from("lead_groups")
      .select("id, name, created_at")
      .eq("id", id)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async getGroupLeads(groupId: string) {
    const { data, error } = await supabase
      .from("group_leads")
      .select("name, phone, custom_fields")
      .eq("group_id", groupId)
    if (error) throw error
    return (data || []).map((it: any) => ({ name: it.name, phone: it.phone, original: it.custom_fields }))
  },

  async replaceGroupLeads(groupId: string, leads: GroupLeadInput[]) {
    // Remove todos e insere novamente (phones normalizados e sem duplicatas)
    const { error: delErr } = await supabase
      .from("group_leads")
      .delete()
      .eq("group_id", groupId)
    if (delErr) throw delErr
    const seen = new Set<string>()
    const rows = (leads || [])
      .map((l) => {
        const name = String(l.name ?? "").trim()
        const phoneRaw = String(l.phone ?? "").trim()
        const phone = phoneRaw.replace(/\D+/g, "")
        return { group_id: groupId, name, phone, custom_fields: l.original ?? null }
      })
      .filter((r) => {
        if (!r.phone) return false
        if (seen.has(r.phone)) return false
        seen.add(r.phone)
        return true
      })
    if (rows.length) {
      const { error: insErr } = await supabase
        .from("group_leads")
        .insert(rows)
      if (insErr) throw insErr
    }
  },
}
