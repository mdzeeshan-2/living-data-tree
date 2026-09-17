import { handleRadar } from '../_lib/handler.js'

export default function handler(req, res) {
  handleRadar('h4', 'h4Bias', req, res)
}
