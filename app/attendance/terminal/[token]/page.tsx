import { TerminalDisplay } from './TerminalDisplay'

export default function TerminalPage({ params }: { params: { token: string } }) {
  return <TerminalDisplay token={params.token} />
}
