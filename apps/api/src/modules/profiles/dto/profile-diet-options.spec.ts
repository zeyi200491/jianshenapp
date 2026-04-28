import { validateSync } from 'class-validator';
import { OnboardingDto } from './onboarding.dto';
import { UpdateProfileDto } from './update-profile.dto';

describe('Profile diet option DTOs', () => {
  const supportedDietPreferences = ['high_protein', 'low_fat', 'low_carb', 'high_fiber', 'quick_meal', 'balanced'];
  const supportedDietRestrictions = ['no_beef', 'no_pork', 'no_seafood', 'no_dairy', 'no_egg', 'vegetarian'];

  it('accepts the onboarding diet options exposed by the web app', () => {
    const dto = Object.assign(new OnboardingDto(), {
      gender: 'male',
      birthYear: 2003,
      heightCm: 178,
      currentWeightKg: 76,
      targetType: 'cut',
      activityLevel: 'moderate',
      trainingExperience: 'beginner',
      trainingDaysPerWeek: 4,
      dietScene: 'canteen',
      dietPreferences: supportedDietPreferences,
      dietRestrictions: supportedDietRestrictions,
      supplementOptIn: true,
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('accepts the same diet options for profile updates', () => {
    const dto = Object.assign(new UpdateProfileDto(), {
      dietPreferences: supportedDietPreferences,
      dietRestrictions: supportedDietRestrictions,
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });
});
