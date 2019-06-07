/**
 * Puddlr Home Script
 */
;(function () {
	$(".point_dot").on("click", function(){
		$(".point_zoom").removeClass("active");
		$(this).next(".point_zoom").addClass("active");
	});
	$(".point_zoom").on("click", function(){
		if($(this).hasClass("active")){
			$(this).removeClass("active");
		}
	});

	$(".hide .submenu.hide").hide();
		$(".qna_title").on("click", function(){

			if($(this).hasClass('toggle')){
				// 닫기
				$(this).removeClass('toggle');
				$(this).find("i").removeClass("mdi-minus").addClass('mdi-plus');

				if ($(this).parents('table').length > 0) {
					$(this).parents('tr').next('tr').find('.submenu').slideUp("middle");
				}
				else {
					$(this).next('.submenu').slideUp("middle");
				}
			}
			else{
				// 열기
				$(this).addClass('toggle');
				$(this).find("i").removeClass("mdi-plus").addClass('mdi-minus');

				if ($(this).parents('table').length > 0) {
					$(this).parents('tr').next('tr').find('.submenu').slideDown("middle");
				}
				else {
					$(this).next('.submenu').slideDown("middle");
				}
			}
			return false;
		})

})();
