import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatedText } from "@/components/ui/animated-text";
import { ParallaxSection } from "@/components/ui/parallax-section";
import ProductCard from "@/components/ProductCard";
import FarmerCard from "@/components/FarmerCard";
import ProcessStep from "@/components/ProcessStep";
import Testimonial from "@/components/Testimonial";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAnimations } from "@/hooks/use-animations";
import { ChevronDown, Leaf, Truck, Sprout, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import type {
  Product,
  Farmer,
  Testimonial as TestimonialType,
  TeamMember,
  Category,
} from "@shared/schema";
import farmerImage from "../../../public/uploads/products/famer-home.jpg";
import { formatSnakeCase } from "@/utils/formatSnakeCase";
const newsletterSchema = z.object({
  name: z.string().optional(),
  email: z.string().email("Please enter a valid email address"),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms",
  }),
});

type NewsletterFormData = z.infer<typeof newsletterSchema>;

export default function Home() {
  // State for category and subcategory filtering
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(
    null
  );
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [product, setProduct] = useState([]);
  // Get products and farmers data
  const { data: productsResponse } = useQuery({
    queryKey: [`${import.meta.env.VITE_API_URL}/api/products`],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/products?limit=50`
      );
      return response.json();
    },
  });

  // Filter featured products on the frontend
  const allProducts = productsResponse?.products || [];
  const products = allProducts.filter((product: Product) => product.featured);

  const { data: farmers = [] } = useQuery<Farmer[]>({
    queryKey: [`${import.meta.env.VITE_API_URL}/api/farmers/featured`],
  });

  // Get categories for filtering
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: [`${import.meta.env.VITE_API_URL}/api/categories/main`],
  });

  // Get subcategories when a category is selected
  const { data: subcategories = [] } = useQuery<Category[]>({
    queryKey: [
      `${import.meta.env.VITE_API_URL}/api/categories`,
      selectedCategory,
      "subcategories",
    ],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/api/categories/${selectedCategory}/subcategories`
      );
      return response.json();
    },
    enabled: !!selectedCategory,
  });

  const { data: testimonials = [] } = useQuery<TestimonialType[]>({
    queryKey: [`${import.meta.env.VITE_API_URL}/api/testimonials`],
  });

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: [`${import.meta.env.VITE_API_URL}/api/team-members`],
  });

  // Animation controller for scroll animations
  const { setupScrollAnimation } = useAnimations();

  // Filter products based on selected category and subcategory
  const filteredProducts = products.filter((product: Product) => {
    if (!selectedCategory && !selectedSubcategory) return true;

    const selectedCategoryName = categories.find(
      (cat) => cat.id === selectedCategory
    )?.name;
    const selectedSubcategoryName = subcategories.find(
      (sub) => sub.id === selectedSubcategory
    )?.name;

    if (selectedSubcategory) {
      return product.subcategory === selectedSubcategoryName;
    }

    if (selectedCategory) {
      return product.category === selectedCategoryName;
    }

    return true;
  });

  // Set up scroll animations
  useEffect(() => {
    setupScrollAnimation();
  }, []);

  // Newsletter form
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<NewsletterFormData>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: {
      name: "",
      email: "",
      agreedToTerms: false,
    },
  });

  const onSubmit = async (data: NewsletterFormData) => {
    try {
      await apiRequest(
        `${import.meta.env.VITE_API_URL}/api/newsletter/subscribe`,
        {
          method: "POST",
          body: JSON.stringify(data),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      toast({
        title: "Subscription successful!",
        description: "Thank you for joining our community.",
      });
    } catch (error) {
      toast({
        title: "Subscription failed",
        description:
          error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    }
  };

  const productData = async () => {
    try {
      const response = await apiRequest(
        `${import.meta.env.VITE_API_URL}/api/products`
      );
      console.log("Nidhi:", response.products);
      setProduct(response.products[9] || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  useEffect(() => {
    productData();
  }, []);

  return (
    <>
      {/* Modern Hero Section */}
      <section className="relative h-screen flex items-center overflow-hidden">
        {/* Background image with parallax effect */}
        <div
          className="absolute inset-0 bg-center bg-cover z-0 transform scale-110"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1500076656116-558758c991c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080')",
            filter: "brightness(0.8)",
          }}
        ></div>

        {/* Decorative overlay elements with improved contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-forest/80 to-black/50 z-10"></div>
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent z-10"></div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent z-10"></div>

        {/* Left-aligned content for modern asymmetric layout */}
        <div className="container mx-auto px-4 lg:px-8 relative z-20 flex flex-col md:flex-row items-center">
          <div className="w-full md:w-1/2 md:pr-8 mb-10 md:mb-0">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="font-heading text-white text-4xl md:text-5xl lg:text-7xl font-bold mb-4 leading-tight text-shadow-extra-strong">
                From <span className="text-secondary font-extrabold">Soil</span>{" "}
                to <span className="text-secondary font-extrabold">Soul</span>
              </h1>

              <h2 className="font-heading text-white text-2xl md:text-3xl lg:text-4xl font-semibold mb-6 text-shadow-extra-strong">
                Pure Nature, Direct to Your Table
              </h2>

              <p className="text-white text-lg max-w-xl mb-8 text-shadow-extra-strong">
                Experience the authentic flavors of traditionally grown,
                chemical-free products sourced directly from the farmers who
                nurture them with generations of wisdom.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link href="/products">
                  <Button
                    size="lg"
                    className="bg-secondary hover:bg-secondary/90 text-white font-semibold px-8 py-6 rounded-md transition duration-300"
                  >
                    Explore Products
                  </Button>
                </Link>

                <Link href="/our-story">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white bg-white/10 font-semibold px-8 py-6 rounded-md transition duration-300"
                  >
                    Our Story
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Floating product card for visual interest */}
          <div className="w-full md:w-1/2">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-2xl transform rotate-2 max-w-md mx-auto"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-20 rounded-full overflow-hidden shrink-0">
                  <img
                    src={
                      product?.imageUrl
                      // "data:image/jpeg;base64,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"
                    }
                    alt="Featured product"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-heading text-forest text-xl font-bold">
                    {product?.name || ""}
                  </h3>
                  <div className="flex items-center text-sm text-secondary font-medium">
                    <Leaf className="h-4 w-4 mr-1" />
                    <span>{product?.category}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-forest text-xl font-bold">
                  ₹{product.price}/{product.quantity}{" "}
                  {product.unit === "pcs" && product.quantity === 1
                    ? "Piece"
                    : formatSnakeCase(product.unit!)}
                </span>
                <Link
                  to={`/products/${product.id}`}
                  className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-semibold transition duration-300"
                >
                  View Details
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20">
          <Link href="#story">
            <div className="text-white animate-bounce bg-black/20 p-2 rounded-full backdrop-blur-sm">
              <ChevronDown className="h-6 w-6" />
            </div>
          </Link>
        </div>
      </section>

      {/* Our Story Section */}
      <section id="story" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16 scroll-animation">
            <h2 className="font-heading text-forest text-3xl md:text-4xl font-bold mb-6">
              Our Story
            </h2>
            <p className="text-olive text-lg">
              We connect you directly with farmers who've dedicated their lives
              to growing the purest, most flavorful products using sustainable,
              traditional methods.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
            <div className="scroll-animation">
              <img
                src={farmerImage}
                alt="Farmer harvesting coffee beans"
                className="rounded-lg shadow-xl w-full h-auto"
              />
            </div>
            <div className="scroll-animation">
              <h3 className="font-heading text-forest text-2xl md:text-3xl font-semibold mb-4">
                Celebrating Our Farmers
              </h3>
              <p className="text-olive mb-4">
                For generations, these dedicated men and women have cultivated
                the earth using knowledge passed down through families. Their
                hands tell stories of hard work, persistence, and deep respect
                for nature.
              </p>
              <p className="text-olive mb-6">
                Without chemical pesticides or artificial enhancers, they grow
                foods with authentic flavors and natural goodness that factory
                farming simply cannot replicate.
              </p>
              <div className="flex flex-wrap items-center">
                <div className="mr-4 mb-4">
                  <span className="block text-secondary text-3xl font-bold">
                    24+
                  </span>
                  <span className="text-olive text-sm">Partner Farms</span>
                </div>
                <div className="h-10 w-px bg-olive/20 mx-4 hidden md:block"></div>
                <div className="mx-4 mb-4">
                  <span className="block text-secondary text-3xl font-bold">
                    100%
                  </span>
                  <span className="text-olive text-sm">Chemical-Free</span>
                </div>
                <div className="h-10 w-px bg-olive/20 mx-4 hidden md:block"></div>
                <div className="ml-4 mb-4">
                  <span className="block text-secondary text-3xl font-bold">
                    8+
                  </span>
                  <span className="text-olive text-sm">Product Categories</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 scroll-animation">
              <h3 className="font-heading text-forest text-2xl md:text-3xl font-semibold mb-4">
                From Soil to Soul
              </h3>
              <p className="text-olive mb-4">
                Every product in our collection has a story. It begins in the
                rich soil of family farms, where generations of agricultural
                wisdom merge with sustainable practices.
              </p>
              <p className="text-olive mb-6">
                We bypass middlemen to ensure farmers receive fair compensation
                for their remarkable work while delivering exceptionally fresh
                products to your doorstep.
              </p>
              <Link href="/our-process">
                <Button className="bg-primary hover:bg-primary-dark text-white font-semibold transition duration-300">
                  Learn About Our Process
                </Button>
              </Link>
            </div>
            <div className="order-1 md:order-2 scroll-animation">
              <img
                src="https://farm.ws/wp-content/uploads/2020/12/inspection-vegetable-garden-quality-by-farmers.jpg"
                alt="Traditional farming methods"
                className="rounded-lg shadow-xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Products Showcase */}
      <section id="products" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12 scroll-animation">
            <h2 className="font-heading text-forest text-3xl md:text-4xl font-bold mb-4">
              Our Products
            </h2>
            <p className="text-olive text-lg">
              Explore our collection of premium farm-fresh products, each grown
              with care and harvested at peak ripeness.
            </p>
          </div>

          {/* Category and Subcategory Navigation */}
          <div className="flex flex-col items-center gap-4 mb-12 scroll-animation">
            {/* Category Selection */}
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant={!selectedCategory ? "default" : "outline"}
                className="px-5 py-2 rounded-full font-medium transition duration-200"
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedSubcategory(null);
                }}
              >
                All Products
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={
                    selectedCategory === category.id ? "default" : "outline"
                  }
                  className="px-5 py-2 rounded-full font-medium transition duration-200"
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setSelectedSubcategory(null);
                  }}
                >
                  {category.name}
                </Button>
              ))}
            </div>
            {/* Subcategory Selection */}
            {selectedCategory && subcategories.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant={!selectedSubcategory ? "default" : "outline"}
                  size="sm"
                  className="px-4 py-1 rounded-full text-sm transition duration-200"
                  onClick={() => setSelectedSubcategory(null)}
                >
                  All{" "}
                  {categories.find((cat) => cat.id === selectedCategory)?.name}
                </Button>
                {subcategories.map((subcategory) => (
                  <Button
                    key={subcategory.id}
                    variant={
                      selectedSubcategory === subcategory.id
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className="px-4 py-1 rounded-full text-sm transition duration-200"
                    onClick={() => setSelectedSubcategory(subcategory.id)}
                  >
                    {subcategory.name}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product: Product) => (
              <div key={product.id} className="scroll-animation">
                <ProductCard product={product} />
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/products">
              <Button
                variant="outline"
                className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold px-8 py-3 rounded-md transition duration-300"
              >
                View All Products
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Parallax Quote Section */}
      <ParallaxSection
        backgroundUrl="https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080"
        className="py-28"
      >
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="font-accent text-white text-3xl md:text-4xl mb-6 text-shadow-strong">
              "The care of the earth is our most ancient and most worthy
              responsibility."
            </p>
            <p className="text-white text-lg text-shadow-strong font-medium">
              — Traditional Farming Wisdom
            </p>
          </div>
        </div>
      </ParallaxSection>

      {/* Meet Our Farmers */}
      <section id="farmers" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16 scroll-animation">
            <h2 className="font-heading text-forest text-3xl md:text-4xl font-bold mb-6">
              Meet Our Farmers
            </h2>
            <p className="text-olive text-lg">
              The passionate individuals whose expertise and dedication bring
              you nature's finest bounty, cultivated with care and respect.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {farmers.map((farmer) => (
              <div key={farmer.id} className="scroll-animation">
                <FarmerCard farmer={farmer} />
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/farmers">
              <Button
                variant="outline"
                className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold px-8 py-3 rounded-md transition duration-300"
              >
                Meet All Our Farmers
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Our Process Section */}
      <section id="process" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16 scroll-animation">
            <h2 className="font-heading text-forest text-3xl md:text-4xl font-bold mb-6">
              Our Process
            </h2>
            <p className="text-olive text-lg">
              From seed to harvest to your doorstep, discover how we maintain
              quality and sustainability at every step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="scroll-animation">
              <ProcessStep
                number={1}
                title="Sustainable Cultivation"
                description="Our partner farmers use traditional, chemical-free methods that preserve soil health and biodiversity. Many practice polyculture, growing multiple crops that support each other naturally."
              />
            </div>

            <div className="scroll-animation">
              <ProcessStep
                number={2}
                title="Careful Harvesting"
                description="Products are harvested by hand at peak ripeness to ensure optimal flavor and nutritional value. This careful approach preserves quality that mechanical harvesting can't match."
              />
            </div>

            <div className="scroll-animation">
              <ProcessStep
                number={3}
                title="Traditional Processing"
                description="Using time-tested methods like sun-drying and small-batch processing, our farmers preserve the natural characteristics of each product without artificial additives or preservatives."
              />
            </div>

            <div className="scroll-animation">
              <ProcessStep
                number={4}
                title="Quality Control"
                description="Every batch is carefully inspected for quality and authenticity. We verify that products meet our strict standards for flavor, appearance, and purity before packaging."
              />
            </div>

            <div className="scroll-animation">
              <ProcessStep
                number={5}
                title="Sustainable Packaging"
                description="Our products are packaged in eco-friendly materials that preserve freshness while minimizing environmental impact. We're constantly improving our packaging to reduce waste."
              />
            </div>

            <div className="scroll-animation">
              <ProcessStep
                number={6}
                title="Direct Delivery"
                description="We ship directly from farms to your doorstep, minimizing handling and ensuring maximum freshness. This direct approach also ensures farmers receive fair compensation for their work."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Product Journey Map */}
      <section className="py-16 md:py-24 bg-background relative overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-16 scroll-animation">
            <h2 className="font-heading text-forest text-3xl md:text-4xl font-bold mb-6">
              From Farm to Your Table
            </h2>
            <p className="text-olive text-lg">
              Trace the journey of our products from the farms where they're
              grown to your doorstep.
            </p>
          </div>

          <div className="relative scroll-animation">
            <div className="bg-white rounded-xl shadow-xl p-6 md:p-10 relative">
              <div className="w-full h-[30rem] bg-background/50 rounded-lg flex items-center justify-center mb-8">
                {/* Placeholder for the interactive map */}
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 800 600"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="p-4"
                >
                  <path
                    d="M400 50C450 200 600 250 700 300"
                    stroke="#DDA15E"
                    strokeWidth="3"
                    strokeDasharray="10 5"
                  />
                  <path
                    d="M400 50C350 200 200 250 100 300"
                    stroke="#DDA15E"
                    strokeWidth="3"
                    strokeDasharray="10 5"
                  />
                  <path
                    d="M100 300C200 350 300 400 400 500"
                    stroke="#5A6F43"
                    strokeWidth="3"
                    strokeDasharray="10 5"
                  />
                  <path
                    d="M700 300C600 350 500 400 400 500"
                    stroke="#5A6F43"
                    strokeWidth="3"
                    strokeDasharray="10 5"
                  />

                  {/* Farm locations */}
                  <circle cx="400" cy="50" r="20" fill="#606C38" />
                  <circle cx="700" cy="300" r="15" fill="#DDA15E" />
                  <circle cx="100" cy="300" r="15" fill="#DDA15E" />
                  <circle cx="400" cy="500" r="20" fill="#BC4749" />

                  {/* Labels */}
                  <text
                    x="400"
                    y="40"
                    textAnchor="middle"
                    fill="#283618"
                    fontFamily="Mulish"
                    fontSize="12"
                  >
                    Central Processing
                  </text>
                  <text
                    x="700"
                    y="290"
                    textAnchor="middle"
                    fill="#283618"
                    fontFamily="Mulish"
                    fontSize="12"
                  >
                    Highland Farms
                  </text>
                  <text
                    x="100"
                    y="290"
                    textAnchor="middle"
                    fill="#283618"
                    fontFamily="Mulish"
                    fontSize="12"
                  >
                    Lowland Farms
                  </text>
                  <text
                    x="400"
                    y="530"
                    textAnchor="middle"
                    fill="#283618"
                    fontFamily="Mulish"
                    fontSize="12"
                  >
                    Your Home
                  </text>
                </svg>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Leaf className="text-secondary text-3xl" />
                  </div>
                  <h3 className="font-heading text-forest text-xl font-semibold mb-2">
                    24+ Partner Farms
                  </h3>
                  <p className="text-olive">
                    Family-owned farms across diverse regions, each with unique
                    growing conditions.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-20 h-20 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Truck className="text-secondary text-3xl" />
                  </div>
                  <h3 className="font-heading text-forest text-xl font-semibold mb-2">
                    Direct Shipping
                  </h3>
                  <p className="text-olive">
                    Products travel directly from farms to our central facility
                    to your home.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-20 h-20 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sprout className="text-secondary text-3xl" />
                  </div>
                  <h3 className="font-heading text-forest text-xl font-semibold mb-2">
                    100% Traceability
                  </h3>
                  <p className="text-olive">
                    Each product can be traced back to the exact farm and farmer
                    who grew it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Meet Our Team Section */}
      {teamMembers.length > 0 && (
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16 scroll-animation">
              <h2 className="font-heading text-forest text-3xl md:text-4xl font-bold mb-6">
                Meet Our Team
              </h2>
              <p className="text-olive text-lg">
                The passionate individuals working behind the scenes to connect
                farmers with consumers while preserving traditional growing
                methods.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {teamMembers.map((member) => (
                <div key={member.id} className="scroll-animation">
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={member.profileImageUrl}
                        alt={member.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="font-heading text-forest text-xl font-bold mb-2">
                        {member.name}
                      </h3>
                      <p className="text-primary font-medium mb-3">
                        {member.jobTitle}
                      </p>
                      <p className="text-olive text-sm leading-relaxed">
                        {member.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section className="py-20 md:py-28 bg-[#283618] text-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-14 scroll-animation">
            <h2 className="font-heading text-[#FEFAE0] text-3xl md:text-4xl font-bold mb-4">
              What Our Customers Say
            </h2>
            <p className="text-white/80 text-lg">
              Discover why people across the country choose our farm-direct
              products.
            </p>
          </div>

          <div className="relative max-w-6xl mx-auto scroll-animation">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {testimonials.slice(0, 3).map((testimonial) => (
                <Testimonial key={testimonial.id} testimonial={testimonial} />
              ))}
            </div>

            {/* <div className="flex justify-center mt-12 space-x-3">
              <div className="w-3 h-3 rounded-full bg-white"></div>
              <div className="w-3 h-3 rounded-full bg-white/40"></div>
              <div className="w-3 h-3 rounded-full bg-white/40"></div>
              <div className="w-3 h-3 rounded-full bg-white/40"></div>
            </div> */}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section id="contact" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden scroll-animation">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Image side */}
              <div className="hidden md:block">
                <img
                  src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=900"
                  alt="Farmer working in terraced fields"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content side */}
              <div className="p-8 md:p-12">
                <h2 className="font-heading text-forest text-3xl font-bold mb-6">
                  Join Our Community
                </h2>
                <p className="text-olive mb-6">
                  Subscribe to receive seasonal recipes, farmer stories, and
                  exclusive offers on our fresh, farm-direct products.
                </p>

                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-forest text-sm font-medium mb-2"
                    >
                      Your Name
                    </label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      className="w-full px-4 py-3 rounded-md border border-olive/20"
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-destructive text-sm mt-1">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-forest text-sm font-medium mb-2"
                    >
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="w-full px-4 py-3 rounded-md border border-olive/20"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-destructive text-sm mt-1">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-start space-x-2">
                    <Controller
                      name="agreedToTerms"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="agreedToTerms"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1"
                        />
                      )}
                    />
                    <label
                      htmlFor="agreedToTerms"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I agree to receive newsletters about products and special
                      offers.
                    </label>
                  </div>
                  {errors.agreedToTerms && (
                    <p className="text-destructive text-sm">
                      {errors.agreedToTerms.message}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-md transition duration-300"
                  >
                    Subscribe Now
                  </Button>
                </form>

                <p className="text-olive/70 text-sm mt-6">
                  By subscribing, you agree to our Privacy Policy. You can
                  unsubscribe at any time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
