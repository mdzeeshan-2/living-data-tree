import { handleRadar } from '../_lib/handler.js'

export default async function handler(req, res) {
  await handleRadar('h1', 'h1Bias', req, res)
}
