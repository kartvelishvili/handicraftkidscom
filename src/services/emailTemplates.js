/**
 * Email Template Service
 * Generates branded HTML email templates for Handicraft Kids (www.handicraft.com.ge)
 */

/**
 * Order confirmation email HTML template
 */
export const generateOrderConfirmationEmail = (order) => {
  const customerName = `${order.customer_info?.firstName || ''} ${order.customer_info?.lastName || ''}`.trim();
  const orderNum = order.order_number || order.id?.substring(0, 8);
  const total = order.total_amount?.toFixed(2) || '0.00';
  const paymentMethod = order.payment_method === 'card' ? 'ბარათით გადახდა' : 'ნაღდი ანგარიშსწორება';
  const city = order.customer_info?.city || '';
  const address = order.customer_info?.address || '';
  const phone = order.customer_info?.phone || '';
  const orderDate = order.created_at 
    ? new Date(order.created_at).toLocaleDateString('ka-GE', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('ka-GE', { year: 'numeric', month: 'long', day: 'numeric' });

  const productsHTML = (order.products || []).map(item => `
    <tr>
      <td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${item.image_url ? `<td style="padding-right: 12px; vertical-align: middle;"><img src="${item.image_url}" alt="${item.name || ''}" style="width: 56px; height: 56px; border-radius: 10px; object-fit: cover; display: block;" /></td>` : ''}
            <td style="vertical-align: middle;">
              <span style="font-weight: 600; color: #334155; font-size: 14px; display: block;">${item.name || 'პროდუქტი'}</span>
              ${item.selectedAttributes ? `<span style="font-size: 12px; color: #94a3b8; margin-top: 2px; display: block;">${Object.entries(item.selectedAttributes || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}</span>` : ''}
            </td>
          </tr>
        </table>
      </td>
      <td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #64748b; font-size: 14px;">×${item.quantity || 1}</td>
      <td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: #1e293b; font-size: 14px;">₾${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
    </tr>
  `).join('');

  const subtotal = (order.products || []).reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  const shipping = parseFloat(total) - subtotal;

  return `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>შეკვეთის დადასტურება #${orderNum}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <!-- Wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f0f4f8;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        
        <!-- Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0e7490, #0d9488); border-radius: 20px 20px 0 0; padding: 36px 32px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="width: 52px; height: 52px; background: rgba(255,255,255,0.2); border-radius: 14px; line-height: 52px; font-size: 26px; display: inline-block; margin-bottom: 12px;">🏪</div>
                    <h1 style="margin: 0; color: white; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Handicraft Kids</h1>
                    <p style="margin: 6px 0 0; color: rgba(255,255,255,0.8); font-size: 13px; letter-spacing: 0.5px;">პრემიუმ ხელნაკეთი ნივთები</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="background: white; padding: 36px 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
              
              <!-- Success badge -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <div style="display: inline-block; background: #ecfdf5; border: 2px solid #a7f3d0; border-radius: 50%; width: 72px; height: 72px; line-height: 72px; text-align: center; font-size: 36px;">✓</div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <h2 style="margin: 0; color: #1e293b; font-size: 24px; font-weight: 700;">მადლობა შეკვეთისთვის!</h2>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 28px;">
                    <p style="margin: 0; color: #64748b; font-size: 15px; line-height: 1.6;">
                      ${customerName ? `${customerName}, ` : ''}თქვენი შეკვეთა <strong style="color: #0e7490;">#${orderNum}</strong> წარმატებით მიღებულია.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Order Info Card -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td colspan="2" style="padding-bottom: 12px;">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8;">შეკვეთის ინფორმაცია</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; font-size: 14px; width: 45%;">შეკვეთის ნომერი</td>
                        <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #1e293b; font-size: 14px;">#${orderNum}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; font-size: 14px;">თარიღი</td>
                        <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 14px;">${orderDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; font-size: 14px;">გადახდა</td>
                        <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 14px;">${paymentMethod}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; font-size: 14px;">ტელეფონი</td>
                        <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 14px;">${phone}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; font-size: 14px;">მისამართი</td>
                        <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 14px;">${city}${address ? ', ' + address : ''}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Products -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
                <thead>
                  <tr>
                    <th style="padding: 10px 16px; text-align: left; color: #94a3b8; text-transform: uppercase; font-size: 11px; letter-spacing: 1.5px; border-bottom: 2px solid #e2e8f0;">პროდუქტი</th>
                    <th style="padding: 10px 16px; text-align: center; color: #94a3b8; text-transform: uppercase; font-size: 11px; letter-spacing: 1.5px; border-bottom: 2px solid #e2e8f0;">რაოდ.</th>
                    <th style="padding: 10px 16px; text-align: right; color: #94a3b8; text-transform: uppercase; font-size: 11px; letter-spacing: 1.5px; border-bottom: 2px solid #e2e8f0;">ფასი</th>
                  </tr>
                </thead>
                <tbody>
                  ${productsHTML}
                </tbody>
              </table>
              
              <!-- Subtotal -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 6px 16px; color: #64748b; font-size: 14px;">ქვე-ჯამი</td>
                  <td style="padding: 6px 16px; text-align: right; color: #334155; font-size: 14px; font-weight: 600;">₾${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 16px; color: #64748b; font-size: 14px;">მიწოდება</td>
                  <td style="padding: 6px 16px; text-align: right; color: #0d9488; font-size: 14px; font-weight: 600;">${shipping <= 0 ? 'უფასო' : `₾${shipping.toFixed(2)}`}</td>
                </tr>
              </table>
              
              <!-- Total -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 28px;">
                <tr>
                  <td style="background: linear-gradient(135deg, #0e7490, #0d9488); border-radius: 14px; padding: 18px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="color: rgba(255,255,255,0.85); font-size: 15px; font-weight: 500;">სულ გადასახდელი:</td>
                        <td style="text-align: right; color: white; font-size: 26px; font-weight: 800;">₾${total}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Delivery Info -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="background: #fffbeb; border-radius: 14px; border: 1px solid #fef3c7; padding: 18px 20px;">
                    <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.7;">
                      📦 თქვენი შეკვეთა მუშავდება და მიწოდება განხორციელდება <strong>2-3 სამუშაო დღის</strong> განმავლობაში.<br>
                      ❓ შეკითხვების შემთხვევაში დაგვიკავშირდით ჩვენს საიტზე.
                    </p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #1e293b; border-radius: 0 0 20px 20px; padding: 28px 32px; text-align: center;">
              <p style="margin: 0 0 6px; color: #e2e8f0; font-size: 14px; font-weight: 600;">Handicraft Kids</p>
              <p style="margin: 0 0 12px; color: #64748b; font-size: 12px;">www.handicraft.com.ge</p>
              <p style="margin: 0; color: #475569; font-size: 11px; line-height: 1.6;">
                ეს მეილი გამოგზავნილია ავტომატურად შეკვეთის დადასტურებისთვის.<br>
                © ${new Date().getFullYear()} Handicraft Kids. ყველა უფლება დაცულია.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>`;
};

/**
 * Admin notification email template
 */
export const generateAdminNotificationEmail = (order) => {
  const customerName = `${order.customer_info?.firstName || ''} ${order.customer_info?.lastName || ''}`.trim();
  const orderNum = order.order_number || order.id?.substring(0, 8);
  const total = order.total_amount?.toFixed(2) || '0.00';
  const paymentMethod = order.payment_method === 'card' ? 'ბარათი' : 'ნაღდი';
  const phone = order.customer_info?.phone || 'N/A';
  const email = order.customer_info?.email || 'N/A';
  const city = order.customer_info?.city || '';
  const address = order.customer_info?.address || '';
  const itemCount = (order.products || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

  return `<!DOCTYPE html>
<html lang="ka">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" style="background:#f0f4f8;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="500" style="max-width:500px;width:100%;">
        <tr><td style="background:#dc2626;border-radius:16px 16px 0 0;padding:24px;text-align:center;">
          <h1 style="margin:0;color:white;font-size:18px;">🔔 ახალი შეკვეთა!</h1>
        </td></tr>
        <tr><td style="background:white;padding:28px 24px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;">
          <table width="100%" style="font-size:14px;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#64748b;">შეკვეთა</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#1e293b;">#${orderNum}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">მომხმარებელი</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#1e293b;">${customerName || 'N/A'}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">ტელეფონი</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#1e293b;">${phone}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">ელ-ფოსტა</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#1e293b;">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">მისამართი</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#1e293b;">${city} ${address}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">ნივთები</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#1e293b;">${itemCount} ერთეული</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">გადახდა</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#1e293b;">${paymentMethod}</td></tr>
            <tr><td colspan="2" style="padding:16px 0 0;border-top:2px solid #e2e8f0;">
              <table width="100%"><tr>
                <td style="color:#64748b;font-size:16px;font-weight:600;">სულ:</td>
                <td style="text-align:right;color:#dc2626;font-size:24px;font-weight:800;">₾${total}</td>
              </tr></table>
            </td></tr>
          </table>
          <div style="margin-top:20px;text-align:center;">
            <a href="https://handicraft.com.ge/admin/orders" style="display:inline-block;background:#0e7490;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">შეკვეთის ნახვა →</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};
