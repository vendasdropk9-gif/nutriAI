export const prefetchMealImages = async (mealPlan: any) => {
  if (!mealPlan) return;
  
  const imagesToLoad: string[] = [];
  
  // Get upcoming meals (simplified logic)
  const today = new Date().toISOString().split('T')[0];
  const planForToday = mealPlan[today];
  
  if (planForToday?.meals) {
    Object.values(planForToday.meals).forEach((meal: any) => {
      if (meal?.imageUrl || meal?.image) {
        imagesToLoad.push(meal.imageUrl || meal.image);
      }
    });
  }

  imagesToLoad.forEach(src => {
    const img = new Image();
    img.src = src;
  });
};
