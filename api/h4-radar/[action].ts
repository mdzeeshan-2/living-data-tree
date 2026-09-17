import { handleRadar } from '../_lib/handler'

export default function handler(req: unknown, res: unknown) {
  handleRadar('h4', 'h4Bias', req as never, res as never)
}
