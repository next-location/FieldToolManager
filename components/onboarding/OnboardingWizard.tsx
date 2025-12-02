'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Step1OrganizationInfo from './Step1OrganizationInfo'
import Step2OperationSettings from './Step2OperationSettings'
import Step3CategorySetup from './Step3CategorySetup'
import Step4UserInvitation from './Step4UserInvitation'
import type { OnboardingFormData } from '@/types/organization'

interface OnboardingWizardProps {
  organizationId: string
}

export default function OnboardingWizard({ organizationId }: OnboardingWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<OnboardingFormData>({
    organizationName: '',
    representativeName: '',
    phone: '',
    postalCode: '',
    address: '',
    industryCategoryIds: [],
    enableLowStockAlert: true,
    defaultMinimumStockLevel: 5,
    defaultStockUnit: '個',
    requireCheckoutApproval: false,
    requireReturnApproval: false,
    selectedCategories: [],
    inviteUsers: [],
  })

  const updateFormData = (updates: Partial<OnboardingFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 4))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, formData }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Setup error:', errorData)
        throw new Error(errorData.details || 'Setup failed')
      }

      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Onboarding error:', error)
      alert('セットアップ中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
                    step === currentStep
                      ? 'bg-blue-600 text-white'
                      : step < currentStep
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {step < currentStep ? '✓' : step}
                </div>
                {step < 4 && (
                  <div
                    className={`mx-2 h-1 w-16 ${
                      step < currentStep ? 'bg-green-600' : 'bg-gray-300'
                    } md:w-32`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between px-2 text-xs font-medium text-gray-600 md:text-sm">
            <span>組織情報</span>
            <span>運用設定</span>
            <span>カテゴリー</span>
            <span>ユーザー招待</span>
          </div>
        </div>

        {/* Step content */}
        <div className="rounded-lg bg-white p-8 shadow-lg">
          {currentStep === 1 && (
            <Step1OrganizationInfo
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
            />
          )}
          {currentStep === 2 && (
            <Step2OperationSettings
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {currentStep === 3 && (
            <Step3CategorySetup
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {currentStep === 4 && (
            <Step4UserInvitation
              formData={formData}
              updateFormData={updateFormData}
              onBack={handleBack}
              onComplete={handleComplete}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  )
}
