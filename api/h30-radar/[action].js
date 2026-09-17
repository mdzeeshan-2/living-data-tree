import { handleRadar } from '../_lib/handler.js'

export default function handler(req, res) {
  handleRadar('h30', 'h30Bias', req, res)
}
