// Mock testimonials from community members — per venue (space)
export const venueTestimonials = {
  'space-1': [
    {
      id: 't1',
      author: 'Priya M.',
      community: 'Queer South Asian Community',
      quote: 'Such a welcoming and creative space. The natural light is perfect for painting. I\'ve hosted two workshops here and will keep coming back.',
      rating: 5,
    },
    {
      id: 't2',
      author: 'Alex K.',
      community: 'Queer South Asian Community',
      quote: 'The best art studio in Sydney. Sarah makes everyone feel at home. Highly recommend for anyone wanting to explore their creative side.',
      rating: 5,
    },
  ],
  'space-2': [
    {
      id: 't3',
      author: 'Maya S.',
      community: 'Sydney Spiritual Community',
      quote: 'This room has such peaceful energy. I come here weekly for meditation. Michael has created something special.',
      rating: 5,
    },
    {
      id: 't4',
      author: 'James L.',
      community: 'Queer South Asian Community',
      quote: 'The yoga mats and sound system are top quality. Perfect for group sessions and retreats.',
      rating: 5,
    },
  ],
  'space-3': [
    {
      id: 't5',
      author: 'Lakshmi R.',
      community: 'Sydney Sri Lankan Tamil Community',
      quote: 'Emma\'s workshop space is fully equipped and safe. Great for DIY projects and skill-sharing events.',
      rating: 5,
    },
  ],
  'space-4': [
    {
      id: 't6',
      author: 'Raj P.',
      community: 'Kamalalaya Hindu Community',
      quote: 'We held our temple festival here last year. The garden and outdoor seating were perfect for our community gathering.',
      rating: 5,
    },
    {
      id: 't7',
      author: 'Sophie T.',
      community: 'Sydney Spiritual Community',
      quote: 'Beautiful venue for celebrations. David is a wonderful host. The lighting in the evening is magical.',
      rating: 5,
    },
  ],
  'space-5': [
    {
      id: 't8',
      author: 'David M.',
      community: 'Sydney Spiritual Community',
      quote: 'The sound bath sessions here are incredible. Lisa\'s studio has amazing acoustics. A must-visit.',
      rating: 5,
    },
  ],
  'space-6': [
    {
      id: 't9',
      author: 'Anita V.',
      community: 'Sydney Sri Lankan Tamil Community',
      quote: 'Quiet, peaceful, and perfect for language meetups. James runs a beautiful space. Our Tamil group meets here monthly.',
      rating: 5,
    },
    {
      id: 't10',
      author: 'Emma W.',
      community: 'Kamalalaya Hindu Community',
      quote: 'I use this library for study and prayer. So serene. Highly recommend for anyone needing a focused environment.',
      rating: 5,
    },
  ],
};

export function getVenueTestimonials(spaceId) {
  return venueTestimonials[spaceId] || [];
}
