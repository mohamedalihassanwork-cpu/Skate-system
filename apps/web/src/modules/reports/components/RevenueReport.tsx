import TimelineReport from './TimelineReport'
export default function RevenueReport(props: { startDate: string; endDate: string }) {
  return <TimelineReport {...props} type="revenue" />
}
