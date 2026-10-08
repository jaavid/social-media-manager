import { parseOnboarding, parseOnboardingWrite } from './onboardingRecovery';
const profile = { id: 7, name: 'Workspace', company: 'Fixture', email: 'team@example.test', phone: '', whatsapp_number: '', website: '', gmb_url: '', business_category: '', brand_description: '', usp: '', brand_tone: '', target_audience: '', gender: 'all', business_location: '', business_subcategories: [], target_locations: [], competitors: [], brand_assets: { logo: '/existing.png' }, profile_image: null, product_images: ['/product.png'], onboarding_complete: false };
test('onboarding requires a real profile and preserves existing asset URL metadata', () => {
  expect(parseOnboarding(profile, 7).product_images).toEqual(['/product.png']);
  for (const value of [{}, { ...profile, id: 8 }, { ...profile, onboarding_complete: undefined }]) expect(() => parseOnboarding(value, 7)).toThrow();
});
test('save/complete acknowledgments match editable fields and actual completion flag', () => {
  expect(parseOnboardingWrite(profile, 7, { company: 'Fixture', product_images: ['/product.png'], brand_assets: { logo: '/existing.png' } })).toHaveProperty('id', 7);
  expect(() => parseOnboardingWrite(profile, 7, { company: 'Changed' })).toThrow();
  expect(() => parseOnboardingWrite(profile, 7, {}, true)).toThrow();
  expect(parseOnboardingWrite({ ...profile, onboarding_complete: true }, 7, {}, true).onboarding_complete).toBe(true);
});
