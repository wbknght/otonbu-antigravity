import { getAppointments } from '@/app/actions/appointments'
import { getServiceTypes } from '@/app/actions/jobs'
import { AppointmentList } from '@/components/AppointmentList'
import { ScheduleHeader } from './header'

export const dynamic = 'force-dynamic'

export default async function SchedulePage() {
    const appointments = await getAppointments()
    const serviceTypes = await getServiceTypes()

    if (!appointments) return <div className="text-white">Randevular yüklenemedi.</div>

    return (
        <div className="max-w-7xl mx-auto h-full flex flex-col">
            <ScheduleHeader serviceTypes={serviceTypes} />

            <div className="mt-6 flex-1">
                <AppointmentList appointments={appointments as any} />
            </div>
        </div>
    )
}
