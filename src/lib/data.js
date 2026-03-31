// Shared data for products and categories to ensure consistency across pages without a backend
export const categories = [
  { name: 'ყველა კატეგორია', icon: null, color: '#57c5cf' },
  { name: 'საძილე ტომარა', icon: 'https://i.postimg.cc/vBFfLVFD/1-sleeping-baby-9338604.png', color: '#f292bc' },
  { name: 'საწოლის ბამპერი', icon: 'https://i.postimg.cc/sXd79hdg/2-baby-crib-9914570.png', color: '#57c5cf' },
  { name: 'გამოსაყვანი ბუდე', icon: 'https://i.postimg.cc/7680M28H/3-bude.png', color: '#f292bc' },
  { name: 'გამოსაყვანი კონვერტი', icon: 'https://i.postimg.cc/vBFfLVFT/4-convert.png', color: '#57c5cf' },
  { name: 'განმავითარებელი წიგნი', icon: 'https://i.postimg.cc/xCDMyzDN/5-baby-book-6609540.png', color: '#f292bc' },
  { name: 'განმავითარებელი ხალიჩა', icon: 'https://i.postimg.cc/fLnmj9nt/6-carpet.png', color: '#57c5cf' },
  { name: 'თეთრეული დიდების', icon: 'https://i.postimg.cc/fLnmj9nm/7-tetreuli.png', color: '#f292bc' },
  { name: 'ინტერაქციული ტანსაცმელი', icon: 'https://i.postimg.cc/NMqm7Hqr/8-interaqtiuli-tansacmeli.png', color: '#57c5cf' },
  { name: 'ნათლობის კაბა', icon: 'https://i.postimg.cc/sXd79hdS/9-natlobis-kaba.png', color: '#f292bc' },
  { name: 'ორთოპედიული ბალიში', icon: 'https://i.postimg.cc/V6QnBCQj/10-ortopediuli-balishi.png', color: '#57c5cf' },
  { name: 'საბავშვო თეთრეული', icon: 'https://i.postimg.cc/gjY1RPVH/pillow-18394681.png', color: '#f292bc' },
  { name: 'კაბა', icon: 'https://i.postimg.cc/ydm9f8sg/12.png', color: '#57c5cf' },
  { name: 'საწოლის ორგანაიზერი', icon: 'https://i.postimg.cc/W3Gr91Tq/13-organaizeri.png', color: '#f292bc' },
  { name: 'ლაქტაციის ბალიში', icon: 'https://i.postimg.cc/RF7fPZ4n/14-laqtaciis.png', color: '#57c5cf' },
  { name: 'საორსულე ბალიში', icon: 'https://i.postimg.cc/26f6BT0Z/feeding-2372696.png', color: '#f292bc' },
  { name: 'ბეიბი ბოქსი', icon: 'https://i.postimg.cc/G29MGJ9P/make-up-bag-4101131.png', color: '#57c5cf' }
];

const productImages = [
  'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1',
  'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4',
  'https://images.unsplash.com/photo-1555447405-058428d1ac96',
  'https://images.unsplash.com/photo-1581557991964-125469da3b8a',
  'https://images.unsplash.com/photo-1627052046046-c506756f1ab2',
  'https://images.unsplash.com/photo-1519689680058-324335c77eba'
];

export const products = Array.from({ length: 60 }, (_, i) => {
  const categoryIndex = (i % (categories.length - 1)) + 1;
  const cat = categories[categoryIndex];
  const catName = cat ? cat.name : 'Unknown';
  return {
    id: i + 1,
    name: `${catName} - მოდელი ${i + 1}`,
    description: `უმაღლესი ხარისხის, ხელნაკეთი ${catName.toLowerCase()}. დამზადებულია ანტიალერგიული მასალებისგან.`,
    category: catName,
    price: Math.floor(Math.random() * 100) + 20,
    rating: (Math.random() * 1.5 + 3.5).toFixed(1),
    reviews: Math.floor(Math.random() * 50) + 1,
    image: productImages[i % productImages.length],
    isNew: Math.random() > 0.8,
    color: i % 2 === 0 ? '#57c5cf' : '#f292bc'
  };
});