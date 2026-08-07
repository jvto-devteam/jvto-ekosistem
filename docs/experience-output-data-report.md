# Experience Output Data Report

Pemeriksaan dilakukan pada sumber invoice, receipt, WhatsApp automation, dan customer portal berikut:

- `/Users/macbook/Code/javavolcano-touroperator/resources/views/Backoffice/email-template/new-reservation.blade.php`
- `/Users/macbook/Code/javavolcano-touroperator/resources/views/Backoffice/email-template/new-receipt-attach.blade.php`
- `/Users/macbook/Code/javavolcano-touroperator/app/Http/Controllers/Api/Web/CheckoutController.php`
- `/Users/macbook/Code/javavolcano-touroperator/app/Http/Controllers/thirdParty/XenditController.php`
- `/Users/macbook/Code/javavolcano-touroperator/app/Console/Commands/ReminderPayment.php`
- `/Users/macbook/Code/javavolcano-touroperator/app/Console/Commands/TripInformation.php`
- `/Users/macbook/Code/javavolcano-touroperator/app/Console/Commands/TripMedia.php`
- `/Users/macbook/Code/javavolcano-touroperator/app/Console/Commands/ReminderBali.php`
- `/Users/macbook/Code/javavolcano-touroperator/app/Console/Commands/TripReminderCrew.php`
- `/Users/macbook/Code/jvto-web/src/app/(website)/my-booking/[slug]/`

## Data Yang Dimasukkan

### Quotation And Invoice

- `5-experience-engine/quotation-and-invoice/invoice-and-receipt-templates.json`

Isi data:

- reservation invoice email
- payment receipt PDF/print template
- customer portal document download links
- bank transfer upload page and payment account information

### Email Templates

- `5-experience-engine/email-templates/transactional-email-templates.json`

Isi data:

- reservation invoice email
- payment receipt attachment/rendered receipt structure

### WhatsApp Messages

- `5-experience-engine/whatsapp-messages/automated-message-templates.json`

Isi data:

- pending payment message
- booking confirmed payment received message
- balance payment confirmed message
- balance payment reminder
- trip information reminder
- custom payment arrangement message
- trip media and review request
- internal new booking notification
- hotel partner room reservation notification
- Bali transport notification and reminder
- crew individual and crew group reminders

### Guest Portal

- `5-experience-engine/guest-portal/customer-portal-definition.json`

Isi data:

- route pattern `my-booking/{{booking_url}}`
- source data pattern `bookings/details/{{booking_url}}?json=true`
- booking, product, logistics, itinerary, accommodation, add-on, crew, vehicle, finance, media, FAQ, packing, and checklist fields
- payment status logic
- payment method actions
- document, review, media, and chat links

## Data Yang Sengaja Tidak Disimpan

- API keys, WA number keys, Xendit key names, group IDs, runtime phone numbers, and raw customer records.
- Full runtime customer values such as customer name, customer phone, email, payment links, and booking URL instances.
- Commented-out legacy MessageBird webhook URLs and inactive gift-card WhatsApp copy.

## Catatan

Semua template aktif disimpan sebagai data terstruktur dengan placeholder runtime. Jadi folder aktif berisi pengetahuan output yang bisa dipakai sistem, bukan kode Blade/PHP mentah dan bukan data customer aktual.
