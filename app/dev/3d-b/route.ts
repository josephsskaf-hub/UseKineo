import { screeningRoom } from '../_screening/room'

export const dynamic = 'force-dynamic'
export function GET(request: Request) {
  return screeningRoom(request, 'b')
}
