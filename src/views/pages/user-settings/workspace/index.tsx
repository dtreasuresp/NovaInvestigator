// Component Import
import { Separator } from '@/components/ui/separator'

import DangerZone from '@/views/pages/user-settings/workspace/danger-zone'
import WorkspaceData from '@/views/pages/user-settings/workspace/workspace-data'
import WorkspaceDetail from '@/views/pages/user-settings/workspace/workspace-detail'
import WorkspaceName from '@/views/pages/user-settings/workspace/workspace-name'
import WorkspaceOrganizations from '@/views/pages/user-settings/workspace/workspace-organizations'
import WorkspaceTeams from '@/views/pages/user-settings/workspace/workspace-teams'
import PrimaryOrganization from '@/views/pages/user-settings/workspace/primary-organization'

const Workspace = () => {
  return (
    <section className='py-3'>
      <PrimaryOrganization />
      <WorkspaceName />
      <Separator className='my-10' />
      <WorkspaceDetail />
      <Separator className='my-10' />
      <WorkspaceTeams />
      <Separator className='my-10' />
      <WorkspaceOrganizations />
      <Separator className='my-10' />
      <WorkspaceData />
      <Separator className='my-10' />
      <DangerZone />
    </section>
  )
}

export default Workspace
