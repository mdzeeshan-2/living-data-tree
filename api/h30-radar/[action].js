import { handleRadar } from '../_lib/handler.js'

export default async function handler(req, res) {
  await handleRadar('h30', 'h30Bias', req, res)
}
