import type { Author } from "../../js/interfaces";

let user = $state(null);
let shown = $state(false);
let anchorRect = $state<DOMRect | null>(null);
let boundaryRect = $state<DOMRect | null>(null);

export function getViewUserState() {
    function setUser(
        newUser: Author | null,
        anchor?: Element | DOMRect | EventTarget | null,
        boundary?: Element | DOMRect | null,
    ) {
        if (!newUser) {
            shown = false;
            anchorRect = null;
            boundaryRect = null;
            console.log("viewUserState - hidden user");
        }
        user = newUser;
        if (user) {
            anchorRect = anchor instanceof Element
                ? anchor.getBoundingClientRect()
                : anchor instanceof DOMRect ? anchor : null;
            boundaryRect = boundary instanceof Element
                ? boundary.getBoundingClientRect()
                : boundary instanceof DOMRect ? boundary : null;
            shown = true;
            console.log("viewUserState - shown user", user);
        }
    }
    return {
        get user() {
            return user;
        },
        get shown() {
            return shown;
        },
        get anchorRect() {
            return anchorRect;
        },
        get boundaryRect() {
            return boundaryRect;
        },
        setUser,
    };
}

