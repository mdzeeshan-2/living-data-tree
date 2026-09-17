import { handleRadar } from '../_lib/handler'

export default function handler(req: unknown, res: unknown) {
  handleRadar('h1', 'h1Bias', req as never, res as never)
}
