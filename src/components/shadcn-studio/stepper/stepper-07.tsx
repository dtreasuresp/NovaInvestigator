'use client'
import {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperNav
} from '@/components/ui/stepper'
import { CircleCheckBigIcon } from 'lucide-react'

const steps = [{ id: '1' }, { id: '2' }, { id: '3' }]

const StepperCheckDemo = () => {
  return (
    <Stepper
      steps={steps}
      className='flex items-center max-md:w-xs md:w-full md:max-w-xl'
      defaultValue={steps[1].id}
      indicators={{
        completed: (
          <CircleCheckBigIcon className='size-5' />
        )
      }}
    >
      <StepperNav>
        {steps.map((step, idx) => (
          <StepperItem key={step.id} stepId={step.id} loading={false}>
            <StepperTrigger className='p-0'>
              <StepperIndicator className='flex items-center justify-center'>{idx + 1}</StepperIndicator>
            </StepperTrigger>
            {idx < steps.length - 1 && <StepperSeparator className='h-0.5 flex-1' />}
          </StepperItem>
        ))}
      </StepperNav>
    </Stepper>
  )
}

export default StepperCheckDemo
