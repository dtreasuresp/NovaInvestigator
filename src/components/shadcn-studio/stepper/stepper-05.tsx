'use client'

import {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperDescription,
  StepperNav
} from '@/components/ui/stepper'

const steps = [
  { id: 'first', description: 'This is the first step' },
  { id: 'second', description: 'This is the second step' },
  { id: 'third', description: 'This is the third step' }
]

const StepperInlineDescriptionDemo = () => {
  return (
    <div className='flex flex-col gap-6 md:w-full md:max-w-3xl'>
      <Stepper steps={steps} className='flex items-center px-4' responsive={true}>
        <StepperNav className='max-md:items-start'>
          {steps.map((step, index) => (
            <StepperItem key={step.id} stepId={step.id} className='max-md:items-start'>
              <StepperTrigger>
                <StepperIndicator>{index + 1}</StepperIndicator>
                <div className='flex flex-col items-start justify-center'>
                  <StepperTitle>Step {index + 1}</StepperTitle>
                  <StepperDescription className='text-nowrap'>{step.description}</StepperDescription>
                </div>
              </StepperTrigger>
              <StepperSeparator className='max-md:hidden' />
              {index < steps.length - 1 && <StepperSeparator className='max-md:ml-4 md:hidden' />}
            </StepperItem>
          ))}
        </StepperNav>
      </Stepper>
      <div className='mx-auto'>
        <div className='text-muted-foreground text-sm'>
          <span className='font-medium'>Responsive</span>
          <span> - switches to vertical layout</span>
        </div>
      </div>
    </div>
  )
}

export default StepperInlineDescriptionDemo
