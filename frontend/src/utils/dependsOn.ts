import { DependsOnCondition } from '@/types';

export function checkDependsOn(
  dependsOn: DependsOnCondition | undefined,
  selectedParams: Record<string, unknown>,
): boolean {
  if (!dependsOn) {
    return true;
  }

  return Object.entries(dependsOn).every(([paramKey, allowedValues]) => {
    const currentValue = selectedParams[paramKey];
    return allowedValues.some((allowedValue) => String(allowedValue) === String(currentValue));
  });
}
