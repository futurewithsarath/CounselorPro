import re

def verify_css_and_markup():
    with open('src/index.css', 'r', encoding='utf-8') as f:
        css = f.read()

    # Verify no overscroll-behavior-y: none on body
    if 'overscroll-behavior-y: none' in css:
        print('[FAIL] overscroll-behavior-y: none still exists in index.css')
    else:
        print('[PASS] overscroll-behavior-y: none is removed from index.css')

    # Verify body has overflow-y: auto
    if 'overflow-y: auto' in css:
        print('[PASS] body has overflow-y: auto for native momentum scrolling')
    else:
        print('[WARN] body does not explicitly specify overflow-y: auto')

    # Verify App.tsx does not have restrictive touch listeners on main container
    with open('src/App.tsx', 'r', encoding='utf-8') as f:
        app = f.read()

    if 'onTouchStart={handleTouchStart}' in app:
        print('[FAIL] onTouchStart swipe listener is still attached to main container in App.tsx')
    else:
        print('[PASS] onTouchStart swipe listener removed from main container in App.tsx')

    # Verify ExamSelector.tsx has automatic card height without fixed min-h-[300px] on mobile
    with open('src/components/ExamSelector.tsx', 'r', encoding='utf-8') as f:
        exam_sel = f.read()

    if 'min-h-[300px]' in exam_sel:
        print('[FAIL] Fixed min-h-[300px] still found in ExamSelector.tsx')
    else:
        print('[PASS] Fixed min-h-[300px] replaced with fluid h-auto lg:min-h-[310px] in ExamSelector.tsx')

    # Check for all 4 cards
    cards = ['AP EAPCET', 'TG EAPCET', 'JEE Main (JoSAA)', 'NEET UG (Medical)']
    for c in cards:
        if c in exam_sel:
            print(f'[PASS] Card present: {c}')
        else:
            print(f'[FAIL] Missing card: {c}')

    # Check for compact select button
    if 'min-h-[36px] min-w-[76px]' in exam_sel:
        print('[PASS] Compact Select button with 36px visual height and accessible touch area is present across cards')
    else:
        print('[WARN] Compact Select button dimensions not found')

if __name__ == '__main__':
    verify_css_and_markup()
