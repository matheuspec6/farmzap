export interface EvolutionInstance {
  instanceName?: string
  instanceId?: string
  id?: string
  name?: string
  status?: string
  connectionStatus?: string
  profileName?: string
  profilePicUrl?: string
  ownerJid?: string
}

export type Instance = { instance: EvolutionInstance } | EvolutionInstance

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

export const evolutionService = {
  async fetchInstances(): Promise<Instance[]> {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.warn("Evolution API URL or Key not configured")
      return []
    }

    try {
      const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json'
        },
        cache: 'no-store' // Ensure fresh data
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch instances: ${response.statusText}`)
      }

      const data = await response.json()
      // Evolution API usually returns an array of instances or an object containing them.
      // Adjusting based on common Evolution API responses, but assuming array based on "fetchInstances" name.
      // If it returns an object, we might need to adjust. 
      // Documentation says fetchInstances returns array of objects with instance details.
      return Array.isArray(data) ? data : (data.instances || [])
    } catch (error) {
      console.error("Error fetching instances:", error)
      return []
    }
  }
}
