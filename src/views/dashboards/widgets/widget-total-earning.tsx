'use client'

// Third-party Imports
import { EllipsisVerticalIcon, ChevronUpIcon, ChevronDownIcon } from 'lucide-react'

// Component Imports
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { useI18n } from '@/hooks/use-i18n'

type Props = {
  title: string
  earning: number
  trend: 'up' | 'down'
  percentage: number
  comparisonText: string
  earningData: {
    img: string
    platform: string
    technologies: string
    earnings: string
    progressPercentage: number
  }[]
  className?: string
}

const TotalEarningCard = ({ earningData, title, earning, trend, percentage, comparisonText, className }: Props) => {
  const { t } = useI18n()

  const listItems = [t('common.export') || 'Compartir', t('common.edit') || 'Actualizar', t('common.refresh') || 'Recargar']

  return (
    <Card className={className}>
      <CardContent className='flex flex-col gap-6'>
        <span className='flex items-center justify-between'>
          <div className='text-lg font-semibold'>{title}</div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant='ghost' size='icon' className='text-muted-foreground size-6 rounded-full' aria-label={t('common.actions')} />}
            >
              <EllipsisVerticalIcon />
              <span className='sr-only'>{t('common.actions')}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuGroup>
                {listItems.map((item, index) => (
                  <DropdownMenuItem key={index}>{item}</DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-2'>
            <span className='text-2xl font-semibold'>${earning}</span>
            <span className='flex items-center gap-1'>
              {trend === 'up' ? <ChevronUpIcon className='size-4' /> : <ChevronDownIcon className='size-4' />}
              <span className='text-sm'>{percentage}%</span>
            </span>
          </div>
          <span className='text-muted-foreground text-sm'>{comparisonText}</span>
        </div>
        <div className='flex flex-col gap-6'>
          {earningData.map((data, index) => (
            <div key={index} className='flex items-center justify-between gap-4'>
              <div className='flex items-center gap-3'>
                <Avatar className='size-8 rounded-sm'>
                  <AvatarFallback className='rounded-sm text-xs font-semibold'>
                    {data.platform.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className='flex flex-col'>
                  <span className='text-sm font-semibold'>{data.platform}</span>
                  <span className='text-muted-foreground text-xs'>{data.technologies}</span>
                </div>
              </div>
              <div className='flex items-center gap-4'>
                <span className='text-sm font-semibold'>{data.earnings}</span>
                <Progress value={data.progressPercentage} className='w-20' />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default TotalEarningCard
