import { handleRadar } from '../_lib/handler.js'

export default async function handler(req, res) {
  await handleRadar('h4', 'h4Bias', req, res)
}
