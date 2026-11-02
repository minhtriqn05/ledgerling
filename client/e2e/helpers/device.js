// Whether a test runs on a phone (the "mobile" project on Chrome and the iPhone one on Safari): the app then shows
// its phone layout, with a top bar and a menu instead of the sidebar, and cards instead of tables.
export const isPhone = (testInfo) => Boolean(testInfo.project.use.isMobile);
