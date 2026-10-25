import TimelineReport from './TimelineReport'
export default function ExpenseReport(props: { startDate: string; endDate: string }) {
  return <TimelineReport {...props} type="expenses" />
}
