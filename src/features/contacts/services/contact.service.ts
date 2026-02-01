import { supabase } from "@/lib/supabase"

export type Contact = {
  id: string
  name: string
  phone: string
  email?: string
  tags?: string[] // IDs of tags
  created_at?: string
}

export type Tag = {
  id: string
  name: string
  color: string
  description?: string
  created_at?: string
}

export const contactService = {
  // --- Tags ---
  async getTags(): Promise<Tag[]> {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("name")
    
    if (error) throw error
    return data || []
  },

  async createTag(tag: Omit<Tag, "id" | "created_at">): Promise<Tag> {
    const { data, error } = await supabase
      .from("tags")
      .insert(tag)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag> {
    const { data, error } = await supabase
      .from("tags")
      .update(updates)
      .eq("id", id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteTag(id: string): Promise<void> {
    const { error } = await supabase
      .from("tags")
      .delete()
      .eq("id", id)
    
    if (error) throw error
  },

  async bulkDeleteTags(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from("tags")
      .delete()
      .in("id", ids)

    if (error) throw error
  },

  // --- Contacts ---
  async getContacts(): Promise<Contact[]> {
    // Buscar contatos e suas tags
    const { data, error } = await supabase
      .from("contacts")
      .select(`
        *,
        contact_tags (
          tag_id
        )
      `)
      .order("created_at", { ascending: false })
    
    if (error) throw error
    
    return (data || []).map((c: any) => ({
      ...c,
      tags: c.contact_tags?.map((ct: any) => ct.tag_id) || []
    }))
  },

  async createContact(contact: Omit<Contact, "id" | "created_at">): Promise<Contact> {
    // 1. Criar contato
    const { data: newContact, error } = await supabase
      .from("contacts")
      .insert({
        name: contact.name,
        phone: contact.phone,
        email: contact.email
      })
      .select()
      .single()
    
    if (error) throw error

    // 2. Associar tags se houver
    if (contact.tags && contact.tags.length > 0) {
      const tagLinks = contact.tags.map(tagId => ({
        contact_id: newContact.id,
        tag_id: tagId
      }))
      
      const { error: tagError } = await supabase
        .from("contact_tags")
        .insert(tagLinks)
      
      if (tagError) console.error("Error associating tags:", tagError)
    }

    return { ...newContact, tags: contact.tags || [] }
  },

  async updateContact(id: string, updates: Partial<Contact>): Promise<Contact> {
    // 1. Atualizar dados básicos
    const { data: updatedContact, error } = await supabase
      .from("contacts")
      .update({
        name: updates.name,
        phone: updates.phone,
        email: updates.email
      })
      .eq("id", id)
      .select()
      .single()
    
    if (error) throw error

    // 2. Atualizar tags (se fornecido)
    if (updates.tags) {
      // Remover todas as tags existentes
      await supabase.from("contact_tags").delete().eq("contact_id", id)
      
      // Adicionar novas
      if (updates.tags.length > 0) {
        const tagLinks = updates.tags.map(tagId => ({
          contact_id: id,
          tag_id: tagId
        }))
        await supabase.from("contact_tags").insert(tagLinks)
      }
    }

    return { ...updatedContact, tags: updates.tags || [] }
  },

  async deleteContact(id: string): Promise<void> {
    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", id)
    
    if (error) throw error
  },

  async bulkDeleteContacts(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from("contacts")
      .delete()
      .in("id", ids)

    if (error) throw error
  },

  async bulkCreateContacts(contacts: Omit<Contact, "id" | "created_at">[]): Promise<void> {
    // 1. Deduplicate input by phone and merge tags
    const contactsMap = new Map<string, Omit<Contact, "id" | "created_at">>()

    contacts.forEach(c => {
        const phone = c.phone
        if (!phone) return

        if (contactsMap.has(phone)) {
            const existing = contactsMap.get(phone)!
            // Merge tags
            const existingTags = existing.tags || []
            const newTags = c.tags || []
            const mergedTags = Array.from(new Set([...existingTags, ...newTags]))
            
            contactsMap.set(phone, {
                ...existing,
                ...c, // Update name/email with latest
                tags: mergedTags
            })
        } else {
            contactsMap.set(phone, c)
        }
    })

    const uniqueContacts = Array.from(contactsMap.values())
    
    // Preparar dados para upsert (contatos)
    const contactsData = uniqueContacts.map(c => ({
      name: c.name,
      phone: c.phone,
      email: c.email
    }))

    const { data: createdContacts, error } = await supabase
      .from("contacts")
      .upsert(contactsData, { onConflict: 'phone' }) // Upsert pelo telefone
      .select()
    
    if (error) throw error

    // Associar tags
    if (createdContacts) {
        const tagInserts: any[] = []
        createdContacts.forEach(c => {
            const source = uniqueContacts.find(uc => uc.phone === c.phone)
            if (source && source.tags && source.tags.length) {
                source.tags.forEach(tId => {
                    tagInserts.push({ contact_id: c.id, tag_id: tId })
                })
            }
        })
        if (tagInserts.length) {
            // Upsert para garantir que não duplique se já existir a relação
            // Assumindo unique constraint (contact_id, tag_id)
            await supabase.from("contact_tags").upsert(tagInserts, { onConflict: 'contact_id,tag_id', ignoreDuplicates: true })
        }
    }
  }
}
