import React from "react";
import "../styles/ChatPage.css";

function ChatPage() {
  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <div className="user-avatar-wrapper">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/4a15f4dcfb917418d4d57866dac5f56c11440d49?placeholderIfAbsent=true"
              alt="User avatar"
              className="user-avatar"
            />
          </div>
          <div className="header-details">
            <div className="header-top-row">
              <div className="user-info">
                <div className="user-name">Serah Johnson</div>
                <div className="user-role">Customer</div>
                <div className="time-indicator">
                  <div>
                    <div
                      dangerouslySetInnerHTML={{
                        __html:
                          '<svg id="41:4226" layer-name="lucide:dot" width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" class="dot-icon" style="width: 24px; height: 24px; aspect-ratio: 1/1"> <path d="M12.1001 13.6C12.6524 13.6 13.1001 13.1523 13.1001 12.6C13.1001 12.0477 12.6524 11.6 12.1001 11.6C11.5478 11.6 11.1001 12.0477 11.1001 12.6C11.1001 13.1523 11.5478 13.6 12.1001 13.6Z" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </svg>',
                      }}
                    />
                  </div>
                  <div className="time-text">5h</div>
                </div>
              </div>
              <div className="header-actions">
                <div className="dots-menu">
                  <div>
                    <div
                      dangerouslySetInnerHTML={{
                        __html:
                          '<svg id="41:4231" layer-name="mage:dots" width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" class="dots-icon" style="width: 24px; height: 24px; aspect-ratio: 1/1"> <path d="M12 6.42C12.2546 6.42 12.4988 6.31886 12.6789 6.13882C12.8589 5.95879 12.96 5.71461 12.96 5.46C12.96 5.20539 12.8589 4.96121 12.6789 4.78118C12.4988 4.60114 12.2546 4.5 12 4.5C11.7454 4.5 11.5013 4.60114 11.3212 4.78118C11.1412 4.96121 11.04 5.20539 11.04 5.46C11.04 5.71461 11.1412 5.95879 11.3212 6.13882C11.5013 6.31886 11.7454 6.42 12 6.42ZM12 13.46C12.2546 13.46 12.4988 13.3589 12.6789 13.1788C12.8589 12.9988 12.96 12.7546 12.96 12.5C12.96 12.2454 12.8589 12.0012 12.6789 11.8212C12.4988 11.6411 12.2546 11.54 12 11.54C11.7454 11.54 11.5013 11.6411 11.3212 11.8212C11.1412 12.0012 11.04 12.2454 11.04 12.5C11.04 12.7546 11.1412 12.9988 11.3212 13.1788C11.5013 13.3589 11.7454 13.46 12 13.46ZM12 20.5C12.2546 20.5 12.4988 20.3989 12.6789 20.2188C12.8589 20.0388 12.96 19.7946 12.96 19.54C12.96 19.2854 12.8589 19.0412 12.6789 18.8612C12.4988 18.6811 12.2546 18.58 12 18.58C11.7454 18.58 11.5013 18.6811 11.3212 18.8612C11.1412 19.0412 11.04 19.2854 11.04 19.54C11.04 19.7946 11.1412 20.0388 11.3212 20.2188C11.5013 20.3989 11.7454 20.5 12 20.5Z" stroke="#666666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> </svg>',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div
                    dangerouslySetInnerHTML={{
                      __html:
                        '<svg id="41:4233" layer-name="ix:cancel" width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" class="close-icon" style="width: 24px; height: 24px; flex-shrink: 0; aspect-ratio: 1/1"> <path fill-rule="evenodd" clip-rule="evenodd" d="M19.71 6.21002L18.2901 4.79004L12 11.09L5.71002 4.79004L4.29004 6.21002L10.59 12.5L4.29004 18.7901L5.71002 20.21L12 13.91L18.2901 20.21L19.71 18.7901L13.41 12.5L19.71 6.21002Z" fill="black" fill-opacity="0.5"></path> </svg>',
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="booking-details">
              <div className="booking-info-row">
                <div className="property-name">1 Bedroom Apertment</div>
                <div className="duration-badge">30 nights</div>
              </div>
              <div className="location-row">
                <div className="location-text">Kilimani, Nairobi</div>
              </div>
              <div className="booking-summary">
                <div className="booking-summary-row">
                  <div className="booking-dates">Jan 8-16, 2025</div>
                  <div className="price-section">
                    <div className="price-text">
                      <span className="price-amount">Ksh 8,000</span>
                      <span className="price-unit">/night</span>
                    </div>
                    <div>
                      <div
                        dangerouslySetInnerHTML={{
                          __html:
                            '<svg id="41:4253" layer-name="weui:arrow-filled" width="24" height="12" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg" class="arrow-icon" style="width: 12px; height: 24px; transform: rotate(90deg); aspect-ratio: 1/2"> <g clip-path="url(#clip0_41_4253)"> <path fill-rule="evenodd" clip-rule="evenodd" d="M11.2889 10.1571L5.63186 4.50006L7.04586 3.08606L11.9959 8.03606L16.9459 3.08606L18.3599 4.50006L12.7029 10.1571C12.5153 10.3445 12.261 10.4498 11.9959 10.4498C11.7307 10.4498 11.4764 10.3445 11.2889 10.1571Z" fill="#666666"></path> </g> <defs> <clipPath id="clip0_41_4253"> <rect width="12" height="24" fill="white" transform="matrix(0 1 -1 0 24 0)"></rect> </clipPath> </defs> </svg>',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="chat-messages">
        <div className="message-bubble">
          <div className="message-avatar-wrapper">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/1a62f5bf020fbae80bb6a60974c7e2e86993f1ae?placeholderIfAbsent=true"
              alt="Host avatar"
              className="message-avatar"
            />
          </div>
          <div className="message-content">
            <div className="message-header">
              <div className="message-header-row">
                <div className="sender-info">
                  <div className="sender-name-wrapper">
                    <div className="sender-name">Thelinks Ads</div>
                  </div>
                  <div className="sender-role">Host</div>
                  <div className="message-time-indicator">
                    <div>
                      <div
                        dangerouslySetInnerHTML={{
                          __html:
                            '<svg id="41:4272" layer-name="lucide:dot" width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" class="dot-icon" style="width: 24px; height: 24px; aspect-ratio: 1/1"> <path d="M12.1001 13.6C12.6524 13.6 13.1001 13.1523 13.1001 12.6C13.1001 12.0477 12.6524 11.6 12.1001 11.6C11.5478 11.6 11.1001 12.0477 11.1001 12.6C11.1001 13.1523 11.5478 13.6 12.1001 13.6Z" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </svg>',
                        }}
                      />
                    </div>
                    <div className="message-time">2sec</div>
                  </div>
                </div>
                <div className="message-actions">
                  <div className="message-dots-menu">
                    <div>
                      <div
                        dangerouslySetInnerHTML={{
                          __html:
                            '<svg id="41:4277" layer-name="mage:dots" width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" class="dots-icon" style="width: 24px; height: 24px; aspect-ratio: 1/1"> <path d="M12 6.42C12.2546 6.42 12.4988 6.31886 12.6789 6.13882C12.8589 5.95879 12.96 5.71461 12.96 5.46C12.96 5.20539 12.8589 4.96121 12.6789 4.78118C12.4988 4.60114 12.2546 4.5 12 4.5C11.7454 4.5 11.5013 4.60114 11.3212 4.78118C11.1412 4.96121 11.04 5.20539 11.04 5.46C11.04 5.71461 11.1412 5.95879 11.3212 6.13882C11.5013 6.31886 11.7454 6.42 12 6.42ZM12 13.46C12.2546 13.46 12.4988 13.3589 12.6789 13.1788C12.8589 12.9988 12.96 12.7546 12.96 12.5C12.96 12.2454 12.8589 12.0012 12.6789 11.8212C12.4988 11.6411 12.2546 11.54 12 11.54C11.7454 11.54 11.5013 11.6411 11.3212 11.8212C11.1412 12.0012 11.04 12.2454 11.04 12.5C11.04 12.7546 11.1412 12.9988 11.3212 13.1788C11.5013 13.3589 11.7454 13.46 12 13.46ZM12 20.5C12.2546 20.5 12.4988 20.3989 12.6789 20.2188C12.8589 20.0388 12.96 19.7946 12.96 19.54C12.96 19.2854 12.8589 19.0412 12.6789 18.8612C12.4988 18.6811 12.2546 18.58 12 18.58C11.7454 18.58 11.5013 18.6811 11.3212 18.8612C11.1412 19.0412 11.04 19.2854 11.04 19.54C11.04 19.7946 11.1412 20.0388 11.3212 20.2188C11.5013 20.3989 11.7454 20.5 12 20.5Z" stroke="#666666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> </svg>',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="message-body">
              <div className="message-text-row">
                <div className="message-text-content">
                  <div className="message-text">
                    <span>
                      I have a one unit that fits your need that is located in
                      Nyali Mombasa Links road. Here is the Link to view the
                      unit
                    </span>
                    <span className="message-link">
                      https://www.airbnb.com/rooms/1073281233917545835?check_in=2025-06-06&amp;check_out=2025-06-08&guests=1&adults=1&s=67&unique_share_id=e1332b42-e14e-446e-8b53-1753c919603e
                    </span>
                  </div>
                </div>
              </div>
              <div className="message-timestamp-section">
                <div className="message-timestamp-row">
                  <div className="message-timestamp">9:54 PM</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="message-bubble">
          <div className="message-avatar-wrapper">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/35afa8dfa1aa43c55eb32626f2a4303ebec760f5?placeholderIfAbsent=true"
              alt="Host avatar"
              className="message-avatar"
            />
          </div>
          <div className="message-content">
            <div className="message-header">
              <div className="message-header-row">
                <div className="sender-info">
                  <div className="sender-name-wrapper">
                    <div className="sender-name">Thelinks Ads</div>
                  </div>
                  <div className="sender-role">Host</div>
                  <div className="message-time-indicator">
                    <div>
                      <div
                        dangerouslySetInnerHTML={{
                          __html:
                            '<svg id="41:4304" layer-name="lucide:dot" width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" class="dot-icon" style="width: 24px; height: 24px; aspect-ratio: 1/1"> <path d="M12.1001 13.6C12.6524 13.6 13.1001 13.1523 13.1001 12.6C13.1001 12.0477 12.6524 11.6 12.1001 11.6C11.5478 11.6 11.1001 12.0477 11.1001 12.6C11.1001 13.1523 11.5478 13.6 12.1001 13.6Z" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </svg>',
                        }}
                      />
                    </div>
                    <div className="message-time">5min</div>
                  </div>
                </div>
                <div className="message-actions">
                  <div className="message-dots-menu">
                    <div>
                      <div
                        dangerouslySetInnerHTML={{
                          __html:
                            '<svg id="41:4309" layer-name="mage:dots" width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" class="dots-icon" style="width: 24px; height: 24px; aspect-ratio: 1/1"> <path d="M12 6.42C12.2546 6.42 12.4988 6.31886 12.6789 6.13882C12.8589 5.95879 12.96 5.71461 12.96 5.46C12.96 5.20539 12.8589 4.96121 12.6789 4.78118C12.4988 4.60114 12.2546 4.5 12 4.5C11.7454 4.5 11.5013 4.60114 11.3212 4.78118C11.1412 4.96121 11.04 5.20539 11.04 5.46C11.04 5.71461 11.1412 5.95879 11.3212 6.13882C11.5013 6.31886 11.7454 6.42 12 6.42ZM12 13.46C12.2546 13.46 12.4988 13.3589 12.6789 13.1788C12.8589 12.9988 12.96 12.7546 12.96 12.5C12.96 12.2454 12.8589 12.0012 12.6789 11.8212C12.4988 11.6411 12.2546 11.54 12 11.54C11.7454 11.54 11.5013 11.6411 11.3212 11.8212C11.1412 12.0012 11.04 12.2454 11.04 12.5C11.04 12.7546 11.1412 12.9988 11.3212 13.1788C11.5013 13.3589 11.7454 13.46 12 13.46ZM12 20.5C12.2546 20.5 12.4988 20.3989 12.6789 20.2188C12.8589 20.0388 12.96 19.7946 12.96 19.54C12.96 19.2854 12.8589 19.0412 12.6789 18.8612C12.4988 18.6811 12.2546 18.58 12 18.58C11.7454 18.58 11.5013 18.6811 11.3212 18.8612C11.1412 19.0412 11.04 19.2854 11.04 19.54C11.04 19.7946 11.1412 20.0388 11.3212 20.2188C11.5013 20.3989 11.7454 20.5 12 20.5Z" stroke="#666666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> </svg>',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="message-body">
              <div className="message-text-row">
                <div className="message-text-content">
                  <div className="message-text-simple">
                    Available in mtwapa Mombasa Kenya Ksh 2,500 per night
                  </div>
                </div>
              </div>
              <div className="message-timestamp-section">
                <div className="message-timestamp-row">
                  <div className="message-timestamp">9:54 PM</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="message-bubble">
          <div className="message-avatar-wrapper">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/86eb595b240a0909e119af64e0148ebe6878e0c9?placeholderIfAbsent=true"
              alt="Host avatar"
              className="message-avatar"
            />
          </div>
          <div className="message-content">
            <div className="message-header">
              <div className="message-header-row">
                <div className="sender-info">
                  <div className="sender-name-wrapper">
                    <div className="sender-name">Thelinks Ads</div>
                  </div>
                  <div className="sender-role">Host</div>
                  <div className="message-time-indicator">
                    <div>
                      <div
                        dangerouslySetInnerHTML={{
                          __html:
                            '<svg id="41:4336" layer-name="lucide:dot" width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" class="dot-icon" style="width: 24px; height: 24px; aspect-ratio: 1/1"> <path d="M12.1001 13.6001C12.6524 13.6001 13.1001 13.1524 13.1001 12.6001C13.1001 12.0478 12.6524 11.6001 12.1001 11.6001C11.5478 11.6001 11.1001 12.0478 11.1001 12.6001C11.1001 13.1524 11.5478 13.6001 12.1001 13.6001Z" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </svg>',
                        }}
                      />
                    </div>
                    <div className="message-time">3h</div>
                  </div>
                </div>
                <div className="message-actions">
                  <div className="message-dots-menu">
                    <div>
                      <div
                        dangerouslySetInnerHTML={{
                          __html:
                            '<svg id="41:4341" layer-name="mage:dots" width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" class="dots-icon" style="width: 24px; height: 24px; aspect-ratio: 1/1"> <path d="M12 6.42C12.2546 6.42 12.4988 6.31886 12.6789 6.13882C12.8589 5.95879 12.96 5.71461 12.96 5.46C12.96 5.20539 12.8589 4.96121 12.6789 4.78118C12.4988 4.60114 12.2546 4.5 12 4.5C11.7454 4.5 11.5013 4.60114 11.3212 4.78118C11.1412 4.96121 11.04 5.20539 11.04 5.46C11.04 5.71461 11.1412 5.95879 11.3212 6.13882C11.5013 6.31886 11.7454 6.42 12 6.42ZM12 13.46C12.2546 13.46 12.4988 13.3589 12.6789 13.1788C12.8589 12.9988 12.96 12.7546 12.96 12.5C12.96 12.2454 12.8589 12.0012 12.6789 11.8212C12.4988 11.6411 12.2546 11.54 12 11.54C11.7454 11.54 11.5013 11.6411 11.3212 11.8212C11.1412 12.0012 11.04 12.2454 11.04 12.5C11.04 12.7546 11.1412 12.9988 11.3212 13.1788C11.5013 13.3589 11.7454 13.46 12 13.46ZM12 20.5C12.2546 20.5 12.4988 20.3989 12.6789 20.2188C12.8589 20.0388 12.96 19.7946 12.96 19.54C12.96 19.2854 12.8589 19.0412 12.6789 18.8612C12.4988 18.6811 12.2546 18.58 12 18.58C11.7454 18.58 11.5013 18.6811 11.3212 18.8612C11.1412 19.0412 11.04 19.2854 11.04 19.54C11.04 19.7946 11.1412 20.0388 11.3212 20.2188C11.5013 20.3989 11.7454 20.5 12 20.5Z" stroke="#666666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> </svg>',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="message-body">
              <div className="message-text-with-gallery">
                <div className="message-text-content">
                  <div className="message-text-simple">
                    Available in mtwapa Mombasa Kenya Ksh 2,500 per night
                  </div>
                </div>
              </div>
              <div className="image-gallery">
                <div className="gallery-top-row">
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/a4a61999ca8612840a7b5fd6128f208dd1a72fa6?placeholderIfAbsent=true"
                    alt="Property image"
                    className="gallery-image-left"
                  />
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/7bfe2c3b85cd3fd0464be994ce704df83d02fb78?placeholderIfAbsent=true"
                    alt="Property image"
                    className="gallery-image-right"
                  />
                </div>
                <div className="gallery-bottom-row">
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/3682f48d140178536098ddabe1786264ecbedfd4?placeholderIfAbsent=true"
                    alt="Property image"
                    className="gallery-image-bottom-left"
                  />
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/ec95ad0f72e90256c363abb5e00c5c51026b46b4?placeholderIfAbsent=true"
                    alt="Property image"
                    className="gallery-image-bottom-center"
                  />
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/338ff3f11d09d9e5f689f43f350409959de068b7?placeholderIfAbsent=true"
                    alt="Property image"
                    className="gallery-image-bottom-right"
                  />
                  <div className="gallery-more-indicator">+6 more</div>
                </div>
              </div>
              <div className="message-timestamp-section">
                <div className="message-timestamp-row">
                  <div className="message-timestamp">9:54 PM</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="chat-input-section">
        <div>
          <div
            dangerouslySetInnerHTML={{
              __html:
                '<svg id="41:4364" layer-name="pajamas:plus" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="plus-icon" style="display: flex; padding: 4px; align-items: center; gap: 10px; border-radius: 8px; width: 32px; height: 32px"> <path fill-rule="evenodd" clip-rule="evenodd" d="M17.5 5.5C17.5 5.10218 17.342 4.72064 17.0607 4.43934C16.7794 4.15804 16.3978 4 16 4C15.6022 4 15.2206 4.15804 14.9393 4.43934C14.658 4.72064 14.5 5.10218 14.5 5.5V14.5H5.5C5.10218 14.5 4.72064 14.658 4.43934 14.9393C4.15804 15.2206 4 15.6022 4 16C4 16.3978 4.15804 16.7794 4.43934 17.0607C4.72064 17.342 5.10218 17.5 5.5 17.5H14.5V26.5C14.5 26.8978 14.658 27.2794 14.9393 27.5607C15.2206 27.842 15.6022 28 16 28C16.3978 28 16.7794 27.842 17.0607 27.5607C17.342 27.2794 17.5 26.8978 17.5 26.5V17.5H26.5C26.8978 17.5 27.2794 17.342 27.5607 17.0607C27.842 16.7794 28 16.3978 28 16C28 15.6022 27.842 15.2206 27.5607 14.9393C27.2794 14.658 26.8978 14.5 26.5 14.5H17.5V5.5Z" fill="#666666"></path> </svg>',
            }}
          />
        </div>
        <div className="message-input">Type your message</div>
        <div>
          <div
            dangerouslySetInnerHTML={{
              __html:
                '<svg id="41:4368" layer-name="iconamoon:send-fill" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="send-icon" style="width: 32px; height: 32px; flex-shrink: 0; aspect-ratio: 1/1"> <path fill-rule="evenodd" clip-rule="evenodd" d="M4.53611 8.89722C4.18945 5.78522 7.39345 3.49989 10.2241 4.84122L26.1494 12.3852C29.2001 13.8292 29.2001 18.1706 26.1494 19.6146L10.2241 27.1599C7.39345 28.5012 4.19078 26.2159 4.53611 23.1039L5.17611 17.3332H16.0001C16.3537 17.3332 16.6929 17.1927 16.9429 16.9427C17.193 16.6926 17.3334 16.3535 17.3334 15.9999C17.3334 15.6463 17.193 15.3071 16.9429 15.0571C16.6929 14.807 16.3537 14.6666 16.0001 14.6666H5.17745L4.53611 8.89722Z" fill="#0066CC"></path> </svg>',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
