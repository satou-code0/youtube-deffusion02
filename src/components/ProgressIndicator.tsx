import React from 'react';
import { Zap, Brain, FileText, Instagram, Twitter, CheckCircle, Sparkles } from 'lucide-react';
import { GenerationProgress } from '../types';

interface ProgressIndicatorProps {
  progress: GenerationProgress;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ progress }) => {
  if (progress.step === 'idle') return null;

  const steps = [
    { 
      key: 'analyzing', 
      label: 'URL解析中', 
      progress: 20, 
      icon: Zap,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500',
      description: '動画情報を取得しています...'
    },
    { 
      key: 'transcribing', 
      label: '字幕取得中', 
      progress: 40, 
      icon: Brain,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500',
      description: 'AIが動画内容を解析中...'
    },
    { 
      key: 'generating-blog', 
      label: 'ブログ記事生成中', 
      progress: 60, 
      icon: FileText,
      color: 'text-green-500',
      bgColor: 'bg-green-500',
      description: '詳細なブログ記事を作成中...'
    },
    { 
      key: 'generating-instagram', 
      label: 'Instagram投稿生成中', 
      progress: 80, 
      icon: Instagram,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500',
      description: 'エンゲージメント重視の投稿を作成中...'
    },
    { 
      key: 'generating-twitter', 
      label: 'X投稿生成中', 
      progress: 90, 
      icon: Twitter,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400',
      description: '簡潔で印象的な投稿を作成中...'
    },
    { 
      key: 'complete', 
      label: '完了', 
      progress: 100, 
      icon: CheckCircle,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500',
      description: '全ての記事が生成されました！'
    },
  ];

  const currentStep = steps.find(s => s.key === progress.step);
  const currentStepIndex = steps.findIndex(s => s.key === progress.step);
  const progressPercentage = currentStep?.progress || 0;

  return (
    <div className="w-full max-w-4xl mx-auto mb-8 animate-slide-up">
      <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 opacity-50"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-youtube-red to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  AI記事生成中
                </h3>
                <p className="text-gray-600 text-sm">高品質なコンテンツを自動生成しています</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold bg-gradient-to-r from-youtube-red to-pink-600 bg-clip-text text-transparent">
                {progressPercentage}%
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">進行状況</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative mb-8">
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
              <div
                className="h-4 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                style={{ 
                  width: `${progressPercentage}%`,
                  background: 'linear-gradient(90deg, #FF0000, #E91E63, #9C27B0, #3F51B5, #2196F3)'
                }}
              >
                <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
              </div>
            </div>
            <div className="absolute top-0 left-0 w-full h-4 rounded-full bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse"></div>
          </div>

          {/* Current Step Display */}
          {currentStep && (
            <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-6 mb-6 border border-gray-100 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 ${currentStep.bgColor} rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300`}>
                  <currentStep.icon className="w-8 h-8 text-white animate-bounce" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-semibold text-gray-800 mb-1">
                    {currentStep.label}
                  </h4>
                  <p className="text-gray-600">
                    {currentStep.description}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              </div>
            </div>
          )}

          {/* Step Indicators */}
          <div className="flex justify-between items-center">
            {steps.slice(0, -1).map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              
              return (
                <div key={step.key} className="flex flex-col items-center space-y-2 flex-1">
                  <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 transform ${
                    isActive 
                      ? `${step.bgColor} scale-110 shadow-lg animate-pulse` 
                      : isCompleted 
                      ? 'bg-emerald-500 shadow-md' 
                      : 'bg-gray-200'
                  }`}>
                    <StepIcon className={`w-6 h-6 transition-colors duration-300 ${
                      isActive || isCompleted ? 'text-white' : 'text-gray-400'
                    }`} />
                    {isActive && (
                      <div className="absolute inset-0 rounded-2xl bg-white opacity-20 animate-pulse"></div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className={`text-xs font-medium transition-colors duration-300 ${
                      isActive ? step.color : isCompleted ? 'text-emerald-600' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </div>
                  </div>
                  
                  {/* Connection Line */}
                  {index < steps.length - 2 && (
                    <div className="absolute top-6 left-1/2 w-full h-0.5 bg-gray-200 -z-10">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          isCompleted ? 'bg-emerald-500' : isActive ? step.bgColor : 'bg-gray-200'
                        }`}
                        style={{ width: isCompleted ? '100%' : isActive ? '50%' : '0%' }}
                      ></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Completion Message */}
          {progress.step === 'complete' && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-3 rounded-full shadow-lg animate-bounce">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">記事生成完了！</span>
                <Sparkles className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};