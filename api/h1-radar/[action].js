import { handleRadar } from '../_lib/handler.js'

export default function handler(req, res) {
  handleRadar('h1', 'h1Bias', req, res)
}
