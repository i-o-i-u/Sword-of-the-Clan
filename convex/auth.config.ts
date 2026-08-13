// إعداد موفِّر الهويّة: يُخبر Convex أن يثق بالرموز التي يوقّعها بنفسه عبر
// @convex-dev/auth. بدونه تُصدَر رموز الجلسة ولا يعرفها الخادم، فيعود
// `getAuthUserId` فارغًا ويظهر صاحب المكتبة زائرًا.
//
// CONVEX_SITE_URL يضبطه Convex نفسه على كل نشر، فلا يُكتب يدويًّا.

export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: 'convex',
    },
  ],
}
