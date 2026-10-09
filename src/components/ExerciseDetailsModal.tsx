import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NutriAiExerciseDetailCard } from './NutriAiExerciseDetailCard';
import { DetailedExercise } from '../data/exerciseDatabase';
import { UserProfile } from '../types';

export interface ExerciseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise?: DetailedExercise | string;
  profile?: UserProfile | null;
  onStartTraining?: (exerciseData: {
    exercise: DetailedExercise;
    sets: number;
    reps: number;
    weight: number;
    rest: number;
  }) => void;
}

export function ExerciseDetailsModal({
  isOpen,
  onClose,
  exercise,
  profile,
  onStartTraining
}: ExerciseDetailsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto no-scrollbar"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-[440px] my-auto"
          >
            <NutriAiExerciseDetailCard
              exercise={exercise}
              profile={profile}
              isModal={true}
              onClose={onClose}
              onStartTraining={(data) => {
                if (onStartTraining) {
                  onStartTraining(data);
                }
                onClose();
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ExerciseDetailsModal;
