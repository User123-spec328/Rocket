import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { LaunchParameters } from '../types/rocket';
import { Rocket, MapPin, Settings, Zap, Weight, Clock, Gauge, Flame, Target } from 'lucide-react';

const schema = yup.object().shape({
  latitude: yup.number().min(-90).max(90).required('Latitude is required'),
  longitude: yup.number().min(-180).max(180).required('Longitude is required'),
  orbitHeight: yup.number().min(0).max(1000).required('Orbit height is required'),
  rocketSpecs: yup.object().shape({
    mass: yup.number().min(1).required('Mass is required'),
    stageSeparationMass: yup.number().min(1).required('Stage separation mass is required'),
    dragCoefficient: yup.number().min(0).max(1).required('Drag coefficient is required'),
    stage1BurnTime: yup.number().min(1).required('Stage 1 burn time is required'),
    stage1Thrust: yup.number().min(1).required('Stage 1 thrust is required'),
    stage1ISP: yup.number().min(1).required('Stage 1 ISP is required'),
    stage2BurnTime: yup.number().min(1).required('Stage 2 burn time is required'),
    stage2Thrust: yup.number().min(1).required('Stage 2 thrust is required'),
    stage2ISP: yup.number().min(1).required('Stage 2 ISP is required')
  })
});

interface RocketFormProps {
  onSubmit: (data: LaunchParameters) => void;
  isLoading?: boolean;
}

export const RocketForm: React.FC<RocketFormProps> = ({ onSubmit, isLoading = false }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<LaunchParameters>({
    resolver: yupResolver(schema),
    defaultValues: {
      latitude: 28.5721,
      longitude: -80.6480,
      orbitHeight: 400,
      rocketSpecs: {
        mass: 549054,
        stageSeparationMass: 131000,
        dragCoefficient: 0.3,
        stage1BurnTime: 162,
        stage1Thrust: 7607000,
        stage1ISP: 282,
        stage2BurnTime: 397,
        stage2Thrust: 934000,
        stage2ISP: 421
      }
    }
  });

  const inputClasses = `
    w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg
    text-white placeholder-gray-400
    focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
    transition-all duration-200
    hover:border-gray-500
  `;

  const labelClasses = `
    block text-sm font-medium text-gray-300 mb-2
    flex items-center gap-2
  `;

  const errorClasses = `
    text-red-400 text-sm mt-1
  `;

  const sectionClasses = `
    bg-gray-900 p-6 rounded-xl border border-gray-700
    hover:border-gray-600 transition-colors duration-200
  `;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-black border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-red-600 rounded-lg">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Two-Stage Rocket Configuration</h2>
            <p className="text-gray-400">Configure your rocket launch specifications with dual-stage parameters</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Launch Coordinates */}
          <div className={sectionClasses}>
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="w-5 h-5 text-red-500" />
              <h3 className="text-xl font-semibold text-white">Launch Coordinates</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelClasses}>
                  Latitude (°)
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.0001"
                  className={inputClasses}
                  placeholder="28.5721"
                  {...register('latitude')}
                />
                {errors.latitude && <p className={errorClasses}>{errors.latitude.message}</p>}
              </div>
              <div>
                <label className={labelClasses}>
                  Longitude (°)
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.0001"
                  className={inputClasses}
                  placeholder="-80.6480"
                  {...register('longitude')}
                />
                {errors.longitude && <p className={errorClasses}>{errors.longitude.message}</p>}
              </div>
              <div>
                <label className={labelClasses}>
                  Target Orbit Height (km)
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  className={inputClasses}
                  placeholder="400"
                  {...register('orbitHeight')}
                />
                {errors.orbitHeight && <p className={errorClasses}>{errors.orbitHeight.message}</p>}
              </div>
            </div>
          </div>

          {/* Rocket Specifications */}
          <div className={sectionClasses}>
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-red-500" />
              <h3 className="text-xl font-semibold text-white">Rocket Specifications</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelClasses}>
                  <Weight className="w-4 h-4" />
                  Total Initial Mass (kg)
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  className={inputClasses}
                  placeholder="549054"
                  {...register('rocketSpecs.mass')}
                />
                {errors.rocketSpecs?.mass && <p className={errorClasses}>{errors.rocketSpecs.mass.message}</p>}
              </div>
              <div>
                <label className={labelClasses}>
                  <Weight className="w-4 h-4" />
                  Stage Separation Mass (kg)
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  className={inputClasses}
                  placeholder="131000"
                  {...register('rocketSpecs.stageSeparationMass')}
                />
                {errors.rocketSpecs?.stageSeparationMass && <p className={errorClasses}>{errors.rocketSpecs.stageSeparationMass.message}</p>}
              </div>
              <div>
                <label className={labelClasses}>
                  <Gauge className="w-4 h-4" />
                  Drag Coefficient
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClasses}
                  placeholder="0.3"
                  {...register('rocketSpecs.dragCoefficient')}
                />
                {errors.rocketSpecs?.dragCoefficient && <p className={errorClasses}>{errors.rocketSpecs.dragCoefficient.message}</p>}
              </div>
            </div>
          </div>

          {/* Stage 1 Details */}
          <div className={sectionClasses}>
            <div className="flex items-center gap-2 mb-6">
              <Flame className="w-5 h-5 text-orange-500" />
              <h3 className="text-xl font-semibold text-white">Stage 1 Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelClasses}>
                  <Clock className="w-4 h-4" />
                  Stage 1 Burn Time (s)
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  className={inputClasses}
                  placeholder="162"
                  {...register('rocketSpecs.stage1BurnTime')}
                />
                {errors.rocketSpecs?.stage1BurnTime && <p className={errorClasses}>{errors.rocketSpecs.stage1BurnTime.message}</p>}
              </div>
              <div>
                <label className={labelClasses}>
                  <Zap className="w-4 h-4" />
                  Stage 1 Thrust (N)
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  className={inputClasses}
                  placeholder="7607000"
                  {...register('rocketSpecs.stage1Thrust')}
                />
                {errors.rocketSpecs?.stage1Thrust && <p className={errorClasses}>{errors.rocketSpecs.stage1Thrust.message}</p>}
              </div>
              <div>
                <label className={labelClasses}>
                  <Gauge className="w-4 h-4" />
                  ISP of Stage 1 (s)
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  className={inputClasses}
                  placeholder="282"
                  {...register('rocketSpecs.stage1ISP')}
                />
                {errors.rocketSpecs?.stage1ISP && <p className={errorClasses}>{errors.rocketSpecs.stage1ISP.message}</p>}
              </div>
            </div>
          </div>

          {/* Stage 2 Details */}
          <div className={sectionClasses}>
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-blue-500" />
              <h3 className="text-xl font-semibold text-white">Stage 2 Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelClasses}>
                  <Clock className="w-4 h-4" />
                  Stage 2 Burn Time (s)
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  className={inputClasses}
                  placeholder="397"
                  {...register('rocketSpecs.stage2BurnTime')}
                />
                {errors.rocketSpecs?.stage2BurnTime && <p className={errorClasses}>{errors.rocketSpecs.stage2BurnTime.message}</p>}
              </div>
              <div>
                <label className={labelClasses}>
                  <Zap className="w-4 h-4" />
                  Stage 2 Thrust (N)
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  className={inputClasses}
                  placeholder="934000"
                  {...register('rocketSpecs.stage2Thrust')}
                />
                {errors.rocketSpecs?.stage2Thrust && <p className={errorClasses}>{errors.rocketSpecs.stage2Thrust.message}</p>}
              </div>
              <div>
                <label className={labelClasses}>
                  <Gauge className="w-4 h-4" />
                  ISP of Stage 2 (s)
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  className={inputClasses}
                  placeholder="421"
                  {...register('rocketSpecs.stage2ISP')}
                />
                {errors.rocketSpecs?.stage2ISP && <p className={errorClasses}>{errors.rocketSpecs.stage2ISP.message}</p>}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`
              w-full py-4 px-6 bg-red-600 text-white font-semibold rounded-lg
              hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900
              transition-all duration-200 transform hover:scale-105
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              flex items-center justify-center gap-2
            `}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Running Two-Stage Simulation...
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" />
                Launch Two-Stage Simulation
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};