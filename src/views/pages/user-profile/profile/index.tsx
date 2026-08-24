'use client'

import AboutSection from '@/views/pages/user-profile/profile/about-section'
import { ActivityTimeline } from '@/views/pages/user-profile/profile/activity-timeline'
import Connections from '@/views/pages/user-profile/profile/connections'
import ProfileProjectDatatable from '@/views/pages/user-profile/profile/profile-project-datatable'
import Teams from '@/views/pages/user-profile/profile/teams'
import { useUserProfileData } from '../use-user-profile-data'

function Profile() {
  const { data, loading } = useUserProfileData()
  const timeline = data?.timeline || []

  return (
    <div className='grid grid-cols-12 gap-6'>
      {/* About & Contacts Section (4 cols) */}
      <div className='col-span-12 space-y-6 lg:col-span-4'>
        <AboutSection />
      </div>

      {/* Activity & Widgets Section (8 cols) */}
      <div className='col-span-12 lg:col-span-8'>
        <div className='grid grid-cols-12 gap-6'>
          {/* Activity timeline */}
          <ActivityTimeline activityLog={timeline} loading={loading} className='col-span-12' />
          {/* Connections Widget */}
          <Connections className='col-span-12 lg:col-span-6' />
          {/* Teams Widget */}
          <Teams className='col-span-12 lg:col-span-6' />
          {/* Projects DataTable */}
          <ProfileProjectDatatable className='col-span-12' />
        </div>
      </div>
    </div>
  )
}

export default Profile
