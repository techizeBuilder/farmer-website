import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Package, Calendar, CreditCard, MapPin, ArrowLeft } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  sku: string;
  imageUrl: string;
  category: string;
}

interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  product: Product | null;
}

interface Payment {
  id: number;
  amount: number;
  status: string;
  method: string;
  razorpayPaymentId: string | null;
}

interface AppliedDiscount {
  id: number;
  code: string;
  type: string;
  value: number;
  description: string;
}

interface Order {
  id: number;
  userId: number;
  sessionId: string;
  paymentId: string | null;
  total: number;
  status: string;
  shippingAddress: string;
  billingAddress: string;
  paymentMethod: string;
  cancellationReason: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payment: Payment | null;
  appliedDiscounts: AppliedDiscount[];
}

interface OrderHistoryResponse {
  orders: Order[];
}

export default function OrderHistory() {
  const { isAuthenticated } = useAuth();

  const { data: orderHistory, isLoading, error } = useQuery<OrderHistoryResponse>({
    queryKey: ['/api/orders/history'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch('/api/orders/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch order history');
      }
      
      return response.json();
    }
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-yellow-100 text-yellow-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Please Log In</h1>
        <p className="text-gray-600 mb-6">You need to be logged in to view your order history.</p>
        <Link href="/login">
          <Button>Go to Login</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Error Loading Orders</h1>
        <p className="text-gray-600">Failed to load your order history. Please try again later.</p>
      </div>
    );
  }

  const orders = orderHistory?.orders || [];

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/account">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Account
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Order History</h1>
          <p className="text-gray-600">View all your past orders and their status</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
            <p className="text-gray-600 mb-6">You haven't placed any orders yet. Start shopping to see your orders here!</p>
            <Link href="/products">
              <Button>Browse Products</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Order #{order.id}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(order.createdAt)}
                      </span>
                      {order.paymentId && (
                        <span className="flex items-center gap-1">
                          <CreditCard className="h-4 w-4" />
                          Payment ID: {order.paymentId.slice(-8)}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Order Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Items:</span>
                        <span>{order.items.length} item(s)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payment Method:</span>
                        <span className="capitalize">
                          {order.payment?.method || order.paymentMethod || 'Unknown'}
                        </span>
                      </div>
                      {order.payment?.razorpayPaymentId && (
                        <div className="flex justify-between">
                          <span>Payment ID:</span>
                          <span className="text-xs font-mono">
                            {order.payment.razorpayPaymentId.slice(-8)}
                          </span>
                        </div>
                      )}
                      {order.appliedDiscounts && order.appliedDiscounts.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-green-600 font-medium">Applied Discounts:</span>
                          {order.appliedDiscounts.map((discount) => (
                            <div key={discount.id} className="flex justify-between text-green-600">
                              <span>Code: {discount.code}</span>
                              <span>
                                {discount.type === 'percentage' ? `${discount.value}%` : `₹${discount.value}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span>₹{order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Shipping Address
                    </h4>
                    <p className="text-sm text-gray-600">{order.shippingAddress}</p>
                    
                    {order.billingAddress && order.billingAddress !== order.shippingAddress && (
                      <>
                        <h4 className="font-semibold mb-2 mt-4">Billing Address</h4>
                        <p className="text-sm text-gray-600">{order.billingAddress}</p>
                      </>
                    )}
                  </div>
                </div>

                {order.items.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <h4 className="font-semibold mb-3">Order Items</h4>
                      <div className="space-y-3">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                            {item.product?.imageUrl && (
                              <img 
                                src={item.product.imageUrl} 
                                alt={item.product.name}
                                className="w-16 h-16 object-cover rounded-md"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">
                                {item.product?.name || `Product ID: ${item.productId}`}
                              </div>
                              {item.product?.sku && (
                                <div className="text-sm text-gray-500">SKU: {item.product.sku}</div>
                              )}
                              {item.product?.category && (
                                <div className="text-sm text-gray-500">Category: {item.product.category}</div>
                              )}
                              <div className="text-sm text-gray-600">
                                Quantity: {item.quantity} × ₹{item.price.toFixed(2)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</div>
                              <div className="text-sm text-gray-500">Total</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {order.deliveredAt && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Delivered on:</strong> {formatDate(order.deliveredAt)}
                    </p>
                  </div>
                )}

                {order.cancellationReason && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>Cancellation Reason:</strong> {order.cancellationReason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}