;; borrower-verification.clar
;; This contract validates business financial information

(define-data-var admin principal tx-sender)

;; Data structure for borrower information
(define-map borrowers
  { borrower-id: uint }
  {
    principal-id: principal,
    business-name: (string-utf8 100),
    revenue: uint,
    credit-score: uint,
    verified: bool
  }
)

;; Counter for borrower IDs
(define-data-var next-borrower-id uint u1)

;; Register a new borrower
(define-public (register-borrower (business-name (string-utf8 100)) (revenue uint) (credit-score uint))
  (let ((borrower-id (var-get next-borrower-id)))
    (begin
      (asserts! (> revenue u0) (err u1)) ;; Revenue must be positive
      (asserts! (and (>= credit-score u300) (<= credit-score u850)) (err u2)) ;; Valid credit score range

      (map-set borrowers
        { borrower-id: borrower-id }
        {
          principal-id: tx-sender,
          business-name: business-name,
          revenue: revenue,
          credit-score: credit-score,
          verified: false
        }
      )

      (var-set next-borrower-id (+ borrower-id u1))
      (ok borrower-id)
    )
  )
)

;; Verify a borrower (admin only)
(define-public (verify-borrower (borrower-id uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u3)) ;; Only admin can verify

    (match (map-get? borrowers { borrower-id: borrower-id })
      borrower-data (begin
        (map-set borrowers
          { borrower-id: borrower-id }
          (merge borrower-data { verified: true })
        )
        (ok true)
      )
      (err u4) ;; Borrower not found
    )
  )
)

;; Get borrower information
(define-read-only (get-borrower (borrower-id uint))
  (map-get? borrowers { borrower-id: borrower-id })
)

;; Check if borrower is verified
(define-read-only (is-verified (borrower-id uint))
  (match (map-get? borrowers { borrower-id: borrower-id })
    borrower-data (get verified borrower-data)
    false
  )
)

;; Transfer admin rights
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u5)) ;; Only current admin can transfer
    (var-set admin new-admin)
    (ok true)
  )
)
