import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../types';

export const useMealReminders = (profile: UserProfile | null) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !profile || !profile.mealRemindersEnabled) return;

    // Listen for fridge items
    const fridgePath = `users/${user.uid}/fridgeItems`;
    const q = query(collection(db, fridgePath));
    const unsubscribeFridge = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc: any) => doc.data());
      
      // Check meal plan
      const mealPlan = profile.mealPlan || {};
      const today = new Date().toISOString().split('T')[0];
      const todayPlan = mealPlan[today];

      if (!todayPlan) return;

      const now = new Date();

      // Check meals
      Object.entries(todayPlan.meals).forEach(([mealType, recipe]) => {
        if (!recipe) return;
        
        // Assume recipe has a prepTime, e.g., "30 min"
        const prepTimeMatch = recipe.prepTime.match(/(\d+)/);
        const prepTime = prepTimeMatch ? parseInt(prepTimeMatch[1]) : 30;
        
        // This is a simplification: need actual meal time.
        // Assuming meal times are in profile.mealNotificationTimes
        const mealTimeStr = profile.mealNotificationTimes?.[mealType as keyof typeof profile.mealNotificationTimes];
        if (!mealTimeStr) return;
        
        const [hour, minute] = mealTimeStr.split(':').map(Number);
        const mealDate = new Date();
        mealDate.setHours(hour, minute, 0, 0);
        
        const reminderTime = new Date(mealDate.getTime() - (60 + prepTime) * 60000); // 1 hour + prep time before
        
        if (now >= reminderTime && now < mealDate) {
          // Check ingredients
          const missingIngredients = recipe.ingredients.filter(ing => 
            !items.some((f: any) => f.name.toLowerCase().includes(ing.toLowerCase()))
          );
          
          if (missingIngredients.length === 0) {
            // Trigger notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`Hora de preparar seu ${mealType}! 🍳`, {
                body: `Você tem todos os ingredientes para "${recipe.name}". Vamos começar?`,
              });
            }
          }
        }
      });
    }, (error) => {
      console.debug('[useMealReminders] Fridge listener notice:', error);
    });

    return () => {
      if (typeof unsubscribeFridge === 'function') {
        try { unsubscribeFridge(); } catch (e) {}
      }
    };
  }, [user, profile]);

  return null;
};
