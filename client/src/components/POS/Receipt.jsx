import React from "react";
import {
  CheckCircle2,
  Printer,
  X,
} from "lucide-react";

import "./Receipt.css";

const Receipt = ({
  sale,
  customer = null,
  onClose,
  onNewSale,
}) => {
  if (!sale) {
    return null;
  }

  const formatMoney = (amount) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
  };

  const formatDate = (date) => {
    if (!date) {
      return "";
    }

    return new Date(date).toLocaleString(
      "en-UG",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  };

  const getPaymentMethodLabel = (
    method
  ) => {
    const methods = {
      CASH: "Cash",
      MOBILE_MONEY:
        "Mobile Money",
      CARD: "Card",
      BANK: "Bank",
    };

    return (
      methods[method] ||
      method ||
      "Unknown"
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNewSale = () => {
    if (onNewSale) {
      onNewSale();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div className="receipt-overlay">

      <div className="receipt-modal">

        {/* ==================================================
            MODAL HEADER
        ================================================== */}

        <div className="receipt-modal-header no-print">

          <div className="flex items-center gap-3">

            <div className="receipt-success-icon">
              <CheckCircle2
                size={20}
              />
            </div>

            <div>
              <h2>
                Sale Completed
              </h2>

              <p>
                Receipt generated successfully
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="receipt-close"
            aria-label="Close receipt"
          >
            <X size={20} />
          </button>

        </div>

        {/* ==================================================
            RECEIPT PAPER
        ================================================== */}

        <div
          id="mova-receipt"
          className="receipt-paper"
        >

          {/* BUSINESS HEADER */}

          <div className="receipt-business">

            <h1>
              MOVA
            </h1>

            <p className="receipt-business-title">
              POINT OF SALE SYSTEM
            </p>

            <p>
              Sales Receipt
            </p>

          </div>

          <div className="receipt-line">
            =================================
          </div>

          {/* SALE INFORMATION */}

          <div className="receipt-information">

            <div>
              <span>
                Receipt:
              </span>

              <strong>
                {sale.receiptNumber}
              </strong>
            </div>

            <div>
              <span>
                Date:
              </span>

              <strong>
                {formatDate(
                  sale.createdAt
                )}
              </strong>
            </div>

            {customer && (
              <div>
                <span>
                  Customer:
                </span>

                <strong>
                  {customer.name}
                </strong>
              </div>
            )}

            {customer?.phone && (
              <div>
                <span>
                  Phone:
                </span>

                <strong>
                  {customer.phone}
                </strong>
              </div>
            )}

          </div>

          <div className="receipt-line">
            ---------------------------------
          </div>

          {/* ITEMS */}

          <div className="receipt-items">

            <div className="receipt-item receipt-item-header">

              <span>
                Item
              </span>

              <span>
                Qty
              </span>

              <span>
                Amount
              </span>

            </div>

            {sale.items?.map(
              (item, index) => (
                <div
                  className="receipt-item"
                  key={
                    item.productId ||
                    index
                  }
                >

                  <span className="receipt-item-name">
                    {item.name}
                  </span>

                  <span>
                    {item.quantity}
                  </span>

                  <span>
                    {formatMoney(
                      item.subtotal
                    )}
                  </span>

                </div>
              )
            )}

          </div>

          <div className="receipt-line">
            ---------------------------------
          </div>

          {/* TOTALS */}

          <div className="receipt-totals">

            <div>
              <span>
                Subtotal
              </span>

              <strong>
                {formatMoney(
                  sale.subtotal
                )}
              </strong>
            </div>

            <div>
              <span>
                Discount
              </span>

              <strong>
                {formatMoney(
                  sale.discount
                )}
              </strong>
            </div>

            <div className="receipt-total">

              <span>
                TOTAL
              </span>

              <strong>
                {formatMoney(
                  sale.total
                )}
              </strong>

            </div>

          </div>

          <div className="receipt-line">
            ---------------------------------
          </div>

          {/* PAYMENT */}

          <div className="receipt-payment">

            <div>
              <span>
                Payment:
              </span>

              <strong>
                {getPaymentMethodLabel(
                  sale.paymentMethod
                )}
              </strong>
            </div>

            <div>
              <span>
                Status:
              </span>

              <strong>
                {sale.paymentStatus}
              </strong>
            </div>

          </div>

          <div className="receipt-line">
            =================================
          </div>

          {/* FOOTER */}

          <div className="receipt-footer">

            <p className="receipt-thank-you">
              Thank you for your business!
            </p>

            <p>
              Please keep this receipt
              for your records.
            </p>

            <p className="receipt-powered">
              Powered by MOVA
            </p>

          </div>

        </div>

        {/* ==================================================
            ACTIONS
        ================================================== */}

        <div className="receipt-actions no-print">

          <button
            type="button"
            onClick={
              handlePrint
            }
            className="receipt-print-button"
          >
            <Printer
              size={18}
            />

            Print Receipt
          </button>

          <button
            type="button"
            onClick={
              handleNewSale
            }
            className="receipt-new-sale-button"
          >
            New Sale
          </button>

        </div>

      </div>

    </div>
  );
};

export default Receipt;