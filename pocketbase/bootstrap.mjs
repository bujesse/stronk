import PocketBase from 'pocketbase'
import { collections } from './collections.mjs'

const baseUrl = process.env.POCKETBASE_INTERNAL_URL || 'http://pocketbase:8090'
const superuserEmail = process.env.PB_SUPERUSER_EMAIL
const superuserPassword = process.env.PB_SUPERUSER_PASSWORD

if (!superuserEmail || !superuserPassword) {
  console.error('PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD are required')
  process.exit(1)
}

const pocketbase = new PocketBase(baseUrl)
pocketbase.autoCancellation(false)

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`)
      if (response.ok) {
        return
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error('PocketBase did not become ready in time')
}

async function main() {
  await waitForServer()
  await pocketbase.collection('_superusers').authWithPassword(superuserEmail, superuserPassword)
  await pocketbase.collections.import(collections, true)
  console.log('PocketBase schema imported')
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
