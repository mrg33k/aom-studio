import DocUpdatesStripe from '../shared/DocUpdateCard.jsx'

export default function HomeStateFeed() {
  return (
    <DocUpdatesStripe
      project=""
      limit={5}
      compact={true}
    />
  )
}
