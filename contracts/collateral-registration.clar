;; collateral-registration.clar
;; This contract records assets securing loans

(define-data-var admin principal tx-sender)

;; Data structure for collateral assets
(define-map collaterals
  { collateral-id: uint }
  {
    borrower-id: uint,
    asset-type: (string-utf8 50),
    asset-value: uint,
    asset-description: (string-utf8 200),
    registered: bool,
    loan-id: (optional uint)
  }
)

;; Counter for collateral IDs
(define-data-var next-collateral-id uint u1)

;; Register a new collateral asset
(define-public (register-collateral
                (borrower-id uint)
                (asset-type (string-utf8 50))
                (asset-value uint)
                (asset-description (string-utf8 200)))
  (let ((collateral-id (var-get next-collateral-id)))
    (begin
      (asserts! (> asset-value u0) (err u1)) ;; Asset value must be positive

      (map-set collaterals
        { collateral-id: collateral-id }
        {
          borrower-id: borrower-id,
          asset-type: asset-type,
          asset-value: asset-value,
          asset-description: asset-description,
          registered: false,
          loan-id: none
        }
      )

      (var-set next-collateral-id (+ collateral-id u1))
      (ok collateral-id)
    )
  )
)

;; Verify a collateral (admin only)
(define-public (verify-collateral (collateral-id uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u2)) ;; Only admin can verify

    (match (map-get? collaterals { collateral-id: collateral-id })
      collateral-data (begin
        (map-set collaterals
          { collateral-id: collateral-id }
          (merge collateral-data { registered: true })
        )
        (ok true)
      )
      (err u3) ;; Collateral not found
    )
  )
)

;; Assign collateral to a loan
(define-public (assign-to-loan (collateral-id uint) (loan-id uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u4)) ;; Only admin can assign

    (match (map-get? collaterals { collateral-id: collateral-id })
      collateral-data (begin
        (asserts! (get registered collateral-data) (err u5)) ;; Collateral must be registered
        (asserts! (is-none (get loan-id collateral-data)) (err u6)) ;; Collateral must not be assigned

        (map-set collaterals
          { collateral-id: collateral-id }
          (merge collateral-data { loan-id: (some loan-id) })
        )
        (ok true)
      )
      (err u7) ;; Collateral not found
    )
  )
)

;; Release collateral from a loan
(define-public (release-from-loan (collateral-id uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u8)) ;; Only admin can release

    (match (map-get? collaterals { collateral-id: collateral-id })
      collateral-data (begin
        (asserts! (is-some (get loan-id collateral-data)) (err u9)) ;; Collateral must be assigned

        (map-set collaterals
          { collateral-id: collateral-id }
          (merge collateral-data { loan-id: none })
        )
        (ok true)
      )
      (err u10) ;; Collateral not found
    )
  )
)

;; Get collateral information
(define-read-only (get-collateral (collateral-id uint))
  (map-get? collaterals { collateral-id: collateral-id })
)

;; Transfer admin rights
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u11)) ;; Only current admin can transfer
    (var-set admin new-admin)
    (ok true)
  )
)
