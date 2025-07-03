import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { Link } from "wouter";
import { X, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Cart() {
  // Access cart context
  const {
    isCartOpen,
    closeCart,
    cartItems,
    updateCartItem,
    removeFromCart,
    subtotal,
    shipping,
    total
  } = useCart();

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
          />
          
          {/* Cart Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed top-0 right-0 h-full w-full md:w-96 bg-background z-50 shadow-2xl"
          >
            <div className="h-full flex flex-col">
              {/* Cart Header */}
              <div className="p-6 border-b border-border/20">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-heading font-bold text-foreground">Your Basket</h2>
                  <Button variant="ghost" size="icon" onClick={closeCart}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cartItems.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground mb-4">Your basket is empty</p>
                    <Button onClick={closeCart} variant="outline">
                      Continue Shopping
                    </Button>
                  </div>
                ) : (
                  <>
                    {cartItems.map((item) => (
                      <div 
                        key={item.product.id} 
                        className="flex items-center space-x-4 pb-4 border-b border-border/10"
                      >
                        <img 
                          src={item.product.imageUrl} 
                          alt={item.product.name} 
                          className="w-16 h-16 object-cover rounded-md"
                        />
                        <div className="flex-1">
                          <h3 className="text-foreground font-medium">{item.product.name}</h3>
                          <p className="text-muted-foreground text-sm">{item.product.category}</p>
                          <div className="flex items-center mt-1">
                            <Button 
                              size="icon" 
                              variant="outline" 
                              className="h-7 w-7"
                              onClick={() => updateCartItem(item.product.id, Math.max(1, item.quantity - 1))}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="px-3 text-sm">{item.quantity}</span>
                            <Button 
                              size="icon" 
                              variant="outline" 
                              className="h-7 w-7"
                              onClick={() => updateCartItem(item.product.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-foreground font-medium">
                            ₹{(item.product.price * item.quantity).toFixed(2)}
                          </p>
                          <Button 
                            variant="link" 
                            className="text-accent text-sm p-0 h-auto mt-2"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
              
              {/* Cart Footer */}
              {cartItems.length > 0 && (
                <div className="p-6 border-t border-border/20">
                  <div className="flex justify-between mb-4">
                    <span className="text-foreground">Subtotal</span>
                    <span className="text-foreground font-semibold">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-6">
                    <span className="text-foreground">Shipping</span>
                    <span className="text-foreground font-semibold">₹{shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg mb-8">
                    <span className="text-foreground font-bold">Total</span>
                    <span className="text-foreground font-bold">₹{total.toFixed(2)}</span>
                  </div>
                  <Link href="/checkout">
                    <Button 
                      className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-md transition duration-300 font-semibold"
                      onClick={closeCart}
                    >
                      Proceed to Checkout
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    className="w-full text-primary hover:text-primary-dark text-center mt-4 transition duration-300"
                    onClick={closeCart}
                  >
                    Continue Shopping
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
